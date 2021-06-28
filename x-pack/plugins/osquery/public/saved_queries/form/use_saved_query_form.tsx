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
import { formSchema } from '../../scheduled_query_groups/queries/schema';
import { ScheduledQueryGroupFormData } from '../../scheduled_query_groups/queries/use_scheduled_query_group_query_form';

const SAVED_QUERY_FORM_ID = 'savedQueryForm';

interface UseSavedQueryFormProps {
  defaultValue?: unknown;
  handleSubmit: (payload: unknown) => Promise<void>;
}

export const useSavedQueryForm = ({ defaultValue, handleSubmit }: UseSavedQueryFormProps) =>
  useForm({
    id: SAVED_QUERY_FORM_ID + uuid.v4(),
    schema: formSchema,
    onSubmit: handleSubmit,
    options: {
      stripEmptyFields: false,
    },
    // @ts-expect-error update types
    defaultValue,
    serializer: (payload) =>
      produce(payload, (draft) => {
        // @ts-expect-error update types
        if (draft.platform?.split(',').length === 3) {
          // if all platforms are checked then use undefined
          // @ts-expect-error update types
          delete draft.platform;
        }
        if (isArray(draft.version)) {
          if (!draft.version.length) {
            // @ts-expect-error update types
            delete draft.version;
          } else {
            draft.version = draft.version[0];
          }
        }
        return draft;
      }),
    // @ts-expect-error update types
    deserializer: (payload) => {
      if (!payload) return {} as ScheduledQueryGroupFormData;

      return {
        id: payload.id,
        description: payload.description,
        query: payload.query,
        interval: payload.interval ? parseInt(payload.interval, 10) : undefined,
        platform: payload.platform,
        version: payload.version ? [payload.version] : [],
      };
    },
  });
