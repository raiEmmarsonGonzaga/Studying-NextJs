'use server';

import { z } from "zod";
import postgres from "postgres";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
const sql = postgres(process.env.POSTGRES_URL!, {ssl: 'require'});

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ id: true, date: true });
const DeleteInvoice = FormSchema.omit({ id: true, date: true });

export type State = {
    error?: {
        customerId?: string[];
        amount?: string[];
        status?: string[];
    }
    message?: string | null;
};

export async function createInvoice(prevState: State, formData: FormData) {
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  if(!validatedFields.success){
    return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Missing Fields. Failed to Create Invoice.',
    }
  }
  const { customerId, amount, status } = validatedFields.data;
  const centavos = amount * 100;
  const date = new Date().toISOString().split('T')[0];
  console.log('Creating Invoice with data: ',  { customerId, amount, status, centavos, date });

  try {
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amount}, ${status}, ${date})
    `;
  } catch (error) {
    console.error('Error creating invoice: ', error);
  }

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}




export async function updateInvoice(id: string, formData: FormData) {
  const {customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  const centavos = amount * 100;
  console.log('Updating Invoice with data: ',  {customerId, amount, status, centavos });

  try {
    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${centavos}, status = ${status}
      WHERE id = ${id}`;
  } catch (error) {
    console.error('Error updating invoice: ', error);
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function deleteInvoiceById(id: string) {

    throw new Error('Function not implemented.');

    await sql`
    DELETE FROM invoices
    WHERE id = ${id}
  `;

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}
