/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArray, isEmpty, xor } from 'lodash';
import uuid from 'uuid';
import { produce } from 'immer';

import { useMemo } from 'react';
import { FormConfig, useForm } from '../../shared_imports';
import { OsqueryManagerPackagePolicyConfigRecord } from '../../../common/types';
import { createFormSchema } from './schema';

const FORM_ID = 'editQueryFlyoutForm';

export interface UseScheduledQueryGroupQueryFormProps {
  uniqueQueryIds: string[];
  defaultValue?: OsqueryManagerPackagePolicyConfigRecord | undefined;
  handleSubmit: FormConfig<ScheduledQueryGroupFormData, ScheduledQueryGroupFormData>['onSubmit'];
}

export interface ScheduledQueryGroupFormData {
  id: string;
  query: string;
  interval: number;
  platform?: string | undefined;
  version?: string[] | undefined;
  ecs_mapping?:
    | Record<
        string,
        {
          field: string;
        }
      >
    | undefined;
}

export const useScheduledQueryGroupQueryForm = ({
  uniqueQueryIds,
  defaultValue,
  handleSubmit,
}: UseScheduledQueryGroupQueryFormProps) => {
  const idSet = useMemo<Set<string>>(
    () =>
      new Set<string>(xor(uniqueQueryIds, defaultValue?.id.value ? [defaultValue.id.value] : [])),
    [uniqueQueryIds, defaultValue]
  );
  const formSchema = useMemo<ReturnType<typeof createFormSchema>>(
    () => createFormSchema(idSet),
    [idSet]
  );

  return useForm<OsqueryManagerPackagePolicyConfigRecord, ScheduledQueryGroupFormData>({
    id: FORM_ID + uuid.v4(),
    onSubmit: async (formData, isValid) => {
      if (isValid && handleSubmit) {
        // @ts-expect-error update types
        return handleSubmit(formData, isValid);
      }
    },
    options: {
      stripEmptyFields: false,
    },
    defaultValue: defaultValue || {
      id: {
        type: 'text',
        value: '',
      },
      query: {
        type: 'text',
        value: '',
      },
      interval: {
        type: 'integer',
        value: '3600',
      },
      ecs_mapping: {
        value: {},
      },
    },
    // @ts-expect-error update types
    serializer: (payload) =>
      produce(payload, (draft) => {
        if (isArray(draft.platform)) {
          draft.platform.join(',');
        }
        if (draft.platform?.split(',').length === 3) {
          // if all platforms are checked then use undefined
          delete draft.platform;
        }
        if (isArray(draft.version)) {
          if (!draft.version.length) {
            delete draft.version;
          } else {
            // @ts-expect-error update types
            draft.version = draft.version[0];
          }
        }
        if (isEmpty(draft.ecs_mapping)) {
          delete draft.ecs_mapping;
        }
        return draft;
      }),
    deserializer: (payload) => {
      if (!payload) return {} as ScheduledQueryGroupFormData;

      return {
        id: payload.id.value,
        query: payload.query.value,
        interval: parseInt(payload.interval.value, 10),
        platform: payload.platform?.value,
        version: payload.version?.value ? [payload.version?.value] : [],
        ecs_mapping: payload.ecs_mapping?.value ?? {},
      };
    },
    schema: formSchema,
  });
};
