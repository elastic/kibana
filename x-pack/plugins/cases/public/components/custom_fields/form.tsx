/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import React, { useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { schema } from './schema';
import { FormFields } from './form_fields';
import type { CustomFieldConfiguration } from '../../../common/types/domain';
import { CustomFieldTypes } from '../../../common/types/domain';
import { customFieldSerializer } from './utils';

export interface CustomFieldFormState {
  isValid: boolean | undefined;
  submit: FormHook<CustomFieldConfiguration>['submit'];
}

interface Props {
  onChange: (state: CustomFieldFormState) => void;
  initialValue: CustomFieldConfiguration | null;
}

const FormComponent: React.FC<Props> = ({ onChange, initialValue }) => {
  const keyDefaultValue = useMemo(() => uuidv4(), []);

  const { form } = useForm({
    defaultValue: initialValue ?? {
      key: keyDefaultValue,
      label: '',
      type: CustomFieldTypes.TEXT,
      required: false,
    },
    options: { stripEmptyFields: false },
    schema,
    serializer: customFieldSerializer,
  });

  const { submit, isValid, isSubmitting } = form;

  useEffect(() => {
    if (onChange) {
      onChange({ isValid, submit });
    }
  }, [onChange, isValid, submit]);

  return (
    <Form form={form}>
      <FormFields isSubmitting={isSubmitting} isEditMode={Boolean(initialValue)} />
    </Form>
  );
};

FormComponent.displayName = 'CustomFieldsForm';

export const CustomFieldsForm = React.memo(FormComponent);
