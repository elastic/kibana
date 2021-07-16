/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArray } from 'lodash';
import uuid from 'uuid';
import { produce } from 'immer';

import { useMemo } from 'react';
import { FormConfig, useForm } from '../../shared_imports';
import { OsqueryManagerPackagePolicyConfigRecord } from '../../../common/types';
import { createFormSchema } from './schema';
import { useScheduledQueryGroup } from '../use_scheduled_query_group';

const FORM_ID = 'editQueryFlyoutForm';

export interface UseScheduledQueryGroupQueryFormProps {
  scheduledQueryGroupId: string;
  defaultValue?: OsqueryManagerPackagePolicyConfigRecord | undefined;
  handleSubmit: FormConfig<
    OsqueryManagerPackagePolicyConfigRecord,
    ScheduledQueryGroupFormData
  >['onSubmit'];
}

export interface ScheduledQueryGroupFormData {
  id: string;
  query: string;
  interval: number;
  platform?: string | undefined;
  version?: string[] | undefined;
}

export const useScheduledQueryGroupQueryForm = ({
  scheduledQueryGroupId,
  defaultValue,
  handleSubmit,
}: UseScheduledQueryGroupQueryFormProps) => {
  const { data } = useScheduledQueryGroup({ scheduledQueryGroupId });
  const ids = useMemo<string[]>(
    () =>
      data?.inputs
        .map((input) => input.streams.map((stream) => stream.compiled_stream.id))
        .flat() ?? [],
    [data]
  );
  const idSet = useMemo<Set<string>>(() => {
    const res = new Set<string>(ids);
    if (defaultValue && defaultValue.id.value) {
      res.delete(defaultValue.id.value);
    }
    return res;
  }, [ids, defaultValue]);
  const formSchema = useMemo<ReturnType<typeof createFormSchema>>(() => createFormSchema(idSet), [
    idSet,
  ]);
  return useForm<OsqueryManagerPackagePolicyConfigRecord, ScheduledQueryGroupFormData>({
    id: FORM_ID + uuid.v4(),
    onSubmit: async (formData, isValid) => {
      if (isValid && handleSubmit) {
        return handleSubmit(formData, isValid);
      }
    },
    options: {
      stripEmptyFields: false,
    },
    defaultValue,
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
      };
    },
    schema: formSchema,
  });
};
