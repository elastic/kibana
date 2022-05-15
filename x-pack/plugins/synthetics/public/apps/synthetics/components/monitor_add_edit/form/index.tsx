/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiForm } from '@elastic/eui';
import { FormProvider } from 'react-hook-form';
import { useFormWrapped } from './use_form_wrapped';
import { DataStream } from '../types';
import { DEFAULT_FORM_FIELDS } from './defaults';

export const MonitorForm: React.FC = ({ children }) => {
  const methods = useFormWrapped({
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: {
      ...DEFAULT_FORM_FIELDS[DataStream.BROWSER],
    },
    shouldFocusError: true,
  });
  const {
    formState: { isValid, isSubmitted },
    handleSubmit,
  } = methods;

  const formSubmitter = (data: Record<string, any>) => {
    console.warn('data', data);
  };

  return (
    <FormProvider {...methods}>
      <EuiForm
        isInvalid={isSubmitted && !isValid}
        component="form"
        onSubmit={handleSubmit(formSubmitter)}
        noValidate
      >
        {children}
        <EuiButton type="submit" />
      </EuiForm>
    </FormProvider>
  );
};
