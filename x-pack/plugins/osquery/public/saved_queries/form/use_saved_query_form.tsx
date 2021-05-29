/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { useForm } from '../../shared_imports';
import { formSchema } from './schema';

const SAVED_QUERY_FORM_ID = 'savedQueryForm';

interface UseSavedQueryFormProps {
  defaultValue?: unknown;
  handleSubmit: () => Promise<void>;
}

export const useSavedQueryForm = ({ defaultValue, handleSubmit }: UseSavedQueryFormProps) => {
  return useForm({
    id: SAVED_QUERY_FORM_ID + uuid.v4(),
    schema: formSchema,
    onSubmit: handleSubmit,
    options: {
      stripEmptyFields: false,
    },
    // @ts-expect-error update types
    defaultValue,
  });
};
