/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArray } from 'lodash';
import uuid from 'uuid';
import { produce } from 'immer';

import { useForm } from '../../shared_imports';
import { formSchema } from './schema';

const FORM_ID = 'editQueryFlyoutForm';

interface UseScheduledQueryGroupQueryFormProps {
  defaultValue?: unknown;
  handleSubmit: () => Promise<void>;
}

export const useScheduledQueryGroupQueryForm = ({
  defaultValue,
  handleSubmit,
}: UseScheduledQueryGroupQueryFormProps) => {
  console.error('default', defaultValue);
  return useForm({
    id: FORM_ID + uuid.v4(),
    // @ts-expect-error update types
    onSubmit: handleSubmit,
    options: {
      stripEmptyFields: false,
    },
    defaultValue,
    serializer: (payload) => {
      console.error('p[aaa', payload);
      return produce(payload, (draft) => {
        if (draft.platform?.split(',').length === 3) {
          // if all platforms are checked then use undefined
          delete draft.platform;
        }
        if (isArray(draft.version)) {
          if (!draft.version.length) {
            delete draft.version;
          } else {
            draft.version = draft.version[0];
          }
        }
        return draft;
      });
    },
    deserializer: (payload) => ({
      id: payload.vars.id.value,
      query: payload.vars.query.value,
      interval: payload.vars.interval.value,
      platform: payload.vars.platform?.value,
      version: payload.vars.version?.value ? [payload.vars.version?.value] : [],
    }),
    schema: formSchema,
  });
};
