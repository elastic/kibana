/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import React, { useCallback, useEffect } from 'react';
import type { FormProps } from './schema';
import { schema } from './schema';
import { FormFields } from './form_fields';

export interface CustomFieldFormState {
  isValid: boolean | undefined;
  isSubmitted: boolean;
  isSubmitting: boolean;
  submit: FormHook['submit'];
}

interface Props {
  onChange: (state: CustomFieldFormState) => void;
}

const FormComponent: React.FC<Props> = ({ onChange }) => {
  const submitForm = useCallback(async (data, isValid) => {
    console.log('submit form', { data, isValid });
  }, []);

  const { form } = useForm<FormProps>({
    defaultValue: { fieldType: 'Text' },
    options: { stripEmptyFields: false },
    schema,
    onSubmit: submitForm,
  });

  const { submit, isValid: isFormValid, isSubmitted, isSubmitting } = form;

  useEffect(() => {
    if (onChange) {
      onChange({ isValid: isFormValid, isSubmitted, isSubmitting, submit });
    }
  }, [onChange, isFormValid, isSubmitted, isSubmitting, submit]);

  return (
    <Form form={form}>
      <FormFields />
    </Form>
  );
};

FormComponent.displayName = 'CustomFieldsForm';

export const CustomFieldsForm = React.memo(FormComponent);
