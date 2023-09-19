/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import React, { useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

import type { FormProps } from './schema';
import { schema } from './schema';
import { FormFields } from './form_fields';
import type { CustomFieldsConfiguration } from '../../../common/types/domain';
import { CustomFieldTypes } from '../../../common/types/domain';

export interface CustomFieldFormState {
  isValid: boolean | undefined;
  submit: FormHook['submit'];
}

interface Props {
  onChange: (state: CustomFieldFormState) => void;
}

const FormComponent: React.FC<Props> = ({ onChange }) => {
  const formSerializer = ({ key, label, type, options }: FormProps) => {
    const customFieldKey = key ? key : uuidv4();

    const serializedData = [
      {
        key: customFieldKey,
        label,
        type,
        required: options?.required ? options.required : false,
      },
    ] as CustomFieldsConfiguration;

    return serializedData;
  };

  const { form } = useForm<FormProps>({
    defaultValue: { type: CustomFieldTypes.TEXT, options: { required: false } },
    options: { stripEmptyFields: false },
    schema,
    // @ts-ignore
    serializer: formSerializer,
  });

  const { submit, isValid, isSubmitting } = form;

  useEffect(() => {
    if (onChange) {
      onChange({ isValid, submit });
    }
  }, [onChange, isValid, submit]);

  return (
    <Form form={form}>
      <FormFields isSubmitting={isSubmitting} />
    </Form>
  );
};

FormComponent.displayName = 'CustomFieldsForm';

export const CustomFieldsForm = React.memo(FormComponent);
