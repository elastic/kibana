/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiForm, EuiSpacer } from '@elastic/eui';
import { FormProvider } from 'react-hook-form';
import { useFormWrapped } from '../hooks/use_form_wrapped';
import { FormMonitorType, SyntheticsMonitor } from '../types';
import { getDefaultFormFields, formatDefaultFormValues } from './defaults';
import { ActionBar } from './submit';
import { Disclaimer } from './disclaimer';

export const MonitorForm: React.FC<{ defaultValues?: SyntheticsMonitor; space?: string }> = ({
  children,
  defaultValues,
  space,
}) => {
  const methods = useFormWrapped({
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues:
      formatDefaultFormValues(defaultValues as SyntheticsMonitor) ||
      getDefaultFormFields(space)[FormMonitorType.MULTISTEP],
    shouldFocusError: true,
  });

  const {
    formState: { isValid, isSubmitted },
  } = methods;

  return (
    <FormProvider {...methods}>
      <EuiForm isInvalid={isSubmitted && !isValid} component="form" noValidate>
        {children}
        <EuiSpacer />
        <ActionBar />
      </EuiForm>
      <Disclaimer />
    </FormProvider>
  );
};
