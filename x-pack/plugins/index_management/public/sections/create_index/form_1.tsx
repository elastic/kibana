/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { useForm, FormConfig } from 'ui/forms/use_form';
import { UseField } from 'ui/forms/components';

import { MyForm } from './types';
import { formSchema } from './form.schema';

export const Form1 = () => {
  const onSubmit: FormConfig<MyForm>['onSubmit'] = (formData, isValid) => {
    // eslint-disable-next-line no-console
    console.log('submitting form', formData, isValid);
  };

  const { form } = useForm<MyForm>({ onSubmit, schema: formSchema });

  return (
    <form onSubmit={form.onSubmit} noValidate>
      <EuiTitle size="m">
        <h2>Form with inputs</h2>
      </EuiTitle>
      <UseField path="name" form={form} renderProps={{ className: 'euiFieldText' }} />
      <UseField
        path="notOnSchema.myProperty"
        form={form}
        type="number"
        renderProps={{ className: 'euiFieldText' }}
      />
      <EuiSpacer size="m" />
      <button type="submit">Submit form</button>
    </form>
  );
};
