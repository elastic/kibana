/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArray, isEmpty, map } from 'lodash';
import uuid from 'uuid';
import { produce } from 'immer';
import { useMemo } from 'react';

import { convertECSMappingToObject } from '../../../common/schemas/common/utils';
import { useForm } from '../../shared_imports';
import { createFormSchema } from '../../packs/queries/schema';
import type {
  PackQueryECSMapping,
  PackQueryFormData,
} from '../../packs/queries/use_pack_query_form';
import { useSavedQueries } from '../use_saved_queries';

const SAVED_QUERY_FORM_ID = 'savedQueryForm';

interface ReturnFormData {
  id?: string;
  description?: string;
  query: string;
  interval?: number;
  platform?: string;
  version?: string[];
  ecs_mapping?: PackQueryECSMapping[] | undefined;
}

interface UseSavedQueryFormProps {
  defaultValue?: PackQueryFormData;
  handleSubmit: (payload: unknown) => Promise<void>;
}

export const useSavedQueryForm = ({ defaultValue, handleSubmit }: UseSavedQueryFormProps) => {
  const { data } = useSavedQueries({});
  const ids: string[] = useMemo<string[]>(
    () => map(data?.saved_objects, 'attributes.id') ?? [],
    [data]
  );
  const idSet = useMemo<Set<string>>(() => {
    const res = new Set<string>(ids);
    if (defaultValue && defaultValue.id) res.delete(defaultValue.id);

    return res;
  }, [ids, defaultValue]);
  const formSchema = useMemo(() => createFormSchema(idSet), [idSet]);

  return useForm<PackQueryFormData, ReturnFormData>({
    id: SAVED_QUERY_FORM_ID + uuid.v4(),
    schema: formSchema,
    onSubmit: async (formData, isValid) => {
      if (isValid) {
        try {
          await handleSubmit(formData);
          // eslint-disable-next-line no-empty
        } catch (e) {}
      }
    },
    defaultValue,
    // @ts-expect-error update types
    serializer: (payload) =>
      produce(payload, (draft) => {
        if (isArray(draft.version)) {
          if (!draft.version.length) {
            // @ts-expect-error update types
            draft.version = '';
          } else {
            // @ts-expect-error update types
            draft.version = draft.version[0];
          }
        }

        if (isEmpty(payload.ecs_mapping)) {
          delete draft.ecs_mapping;
        } else {
          // @ts-expect-error update types
          draft.ecs_mapping = convertECSMappingToObject(payload.ecs_mapping);
        }

        // @ts-expect-error update types
        draft.interval = draft.interval + '';

        return draft;
      }),
    deserializer: (payload) => {
      if (!payload) return {} as ReturnFormData;

      return {
        id: payload.id,
        description: payload.description,
        query: payload.query,
        interval: payload.interval ?? 3600,
        platform: payload.platform,
        version: payload.version ? [payload.version] : [],
        ecs_mapping: (!isEmpty(payload.ecs_mapping)
          ? map(payload.ecs_mapping, (value, key: string) => ({
              key,
              result: {
                type: Object.keys(value)[0],
                value: Object.values(value)[0],
              },
            }))
          : ([] as PackQueryECSMapping[])) as PackQueryECSMapping[],
      };
    },
  });
};
