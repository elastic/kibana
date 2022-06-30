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
import { PackFormData } from '../../packs/queries/use_pack_query_form';
import { useSavedQueries } from '../use_saved_queries';

const SAVED_QUERY_FORM_ID = 'savedQueryForm';

interface UseSavedQueryFormProps {
  defaultValue?: unknown;
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
    // @ts-expect-error update types
    if (defaultValue && defaultValue.id) res.delete(defaultValue.id);

    return res;
  }, [ids, defaultValue]);
  const formSchema = useMemo<ReturnType<typeof createFormSchema>>(
    () => createFormSchema(idSet),
    [idSet]
  );

  return useForm({
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
    // @ts-expect-error update types
    defaultValue,
    serializer: (payload) =>
      produce(payload, (draft) => {
        if (isArray(draft.version)) {
          if (!draft.version.length) {
            // @ts-expect-error update types
            delete draft.version;
          } else {
            draft.version = draft.version[0];
          }
        }

        if (isEmpty(payload.ecs_mapping)) {
          // @ts-expect-error update types
          delete draft.ecs_mapping;
        } else {
          // @ts-expect-error update types
          draft.ecs_mapping = convertECSMappingToObject(payload.ecs_mapping);
        }

        // @ts-expect-error update types
        draft.interval = draft.interval + '';

        return draft;
      }),
    // @ts-expect-error update types
    deserializer: (payload) => {
      if (!payload) return {} as PackFormData;

      return {
        id: payload.id,
        description: payload.description,
        query: payload.query,
        interval: payload.interval ?? 3600,
        platform: payload.platform,
        version: payload.version ? [payload.version] : [],
        ecs_mapping:
          (!isEmpty(payload.ecs_mapping) &&
            map(payload.ecs_mapping, (value, key) => ({
              key,
              result: {
                type: Object.keys(value)[0],
                value: Object.values(value)[0],
              },
            }))) ??
          [],
      };
    },
  });
};
