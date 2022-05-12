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
import { MonitorType, MonitorTypeRadioGroup } from '../fields/monitor_type_radio_group';
import { ConfigKey } from '../types';

export const MonitorForm: React.FC = ({ children }) => {
  const methods = useFormWrapped({
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      select: '',
      'source.inline.script': '',
      [ConfigKey.REQUEST_HEADERS_CHECK]: {},
      [ConfigKey.REQUEST_BODY_CHECK]: {
        value: '',
        type: 'javascript',
      },
      [ConfigKey.RESPONSE_STATUS_CHECK]: [],
    },
    shouldFocusError: true,
  });
  const {
    formState: { errors, isValid, isSubmitted },
    control,
    handleSubmit,
    register,
  } = methods;

  const formSubmitter = (data: Record<string, any>) => {
    console.warn('data', data);
    alert(JSON.stringify(data, null, 2));
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
