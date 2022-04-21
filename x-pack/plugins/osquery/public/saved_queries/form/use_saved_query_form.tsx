/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArray, isEmpty, map } from 'lodash';
import uuid from 'uuid';
import { produce } from 'immer';
import { RefObject, useMemo } from 'react';

import { useForm } from '../../shared_imports';
import { createFormSchema } from '../../packs/queries/schema';
import { PackFormData } from '../../packs/queries/use_pack_query_form';
import { useSavedQueries } from '../use_saved_queries';
import { SavedQueryFormRefObject } from '.';

const SAVED_QUERY_FORM_ID = 'savedQueryForm';

interface UseSavedQueryFormProps {
  defaultValue?: unknown;
  handleSubmit: (payload: unknown) => Promise<void>;
  savedQueryFormRef: RefObject<SavedQueryFormRefObject>;
}

export const useSavedQueryForm = ({
  defaultValue,
  handleSubmit,
  savedQueryFormRef,
}: UseSavedQueryFormProps) => {
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
      const ecsFieldValue = await savedQueryFormRef?.current?.validateEcsMapping();

      if (isValid && !!ecsFieldValue) {
        try {
          await handleSubmit({
            ...formData,
            ecs_mapping: ecsFieldValue,
          });
          // eslint-disable-next-line no-empty
        } catch (e) {}
      }
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

        if (isEmpty(draft.ecs_mapping)) {
          // @ts-expect-error update types
          delete draft.ecs_mapping;
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
        ecs_mapping: payload.ecs_mapping ?? {},
      };
    },
  });
};
