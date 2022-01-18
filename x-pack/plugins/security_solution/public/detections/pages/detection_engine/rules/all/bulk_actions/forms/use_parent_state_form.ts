/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';

import { useForm, FormSchema } from '../../../../../../../shared_imports';

import { BulkActionEditPayload } from '../../../../../../../../common/detection_engine/schemas/common/schemas';

export interface FormState {
  isValid: boolean | undefined;
  getEditActionPayload(): BulkActionEditPayload;
  formTitle: string | null;
  validate(): Promise<boolean>;
}

export const initialState = {
  isValid: undefined,
  validate: async () => true,
  formTitle: null,
} as FormState;

interface UseParentStateForm<Data, Schema> {
  data: Data;
  onChange: (formState: FormState) => void;
  schema: FormSchema<Schema>;
  config: {
    formTitle: string;
    prepareEditActionPayload: (formData: Data) => BulkActionEditPayload;
  };
}

export const useParentStateForm = <Data, Schema>({
  data,
  schema,
  onChange,
  config: { formTitle, prepareEditActionPayload },
}: UseParentStateForm<Data, Schema>) => {
  const { form } = useForm<Data, Schema>({
    defaultValue: data,
    schema,
  });

  const { isValid, validate, getFormData } = form;

  useEffect(() => {
    const updatedFormState = {
      isValid,
      getEditActionPayload: () => prepareEditActionPayload(getFormData()),
      validate,
      formTitle,
    };

    // Forward the state to the parent
    onChange(updatedFormState);
  }, [onChange, formTitle, isValid, getFormData, validate, prepareEditActionPayload]);

  return { form };
};
