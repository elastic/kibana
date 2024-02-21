/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useForm as useHookForm } from 'react-hook-form';
import { isArray, map } from 'lodash';
import type { Draft } from 'immer';
import produce from 'immer';
import { useMemo } from 'react';
import { useSavedScripts } from '../use_saved_scripts';

export interface SavedScriptsFormData {
  id?: string;
  description?: string;
  command?: string;
  timeout?: number;
  platform?: string;
}

interface UseSavedQueryFormProps {
  defaultValue?: SavedScriptsFormData;
}

const deserializer = (payload: SavedScriptsFormData): SavedScriptsFormData => ({
  id: payload.id,
  description: payload.description,
  command: payload.command,
  timeout: payload.timeout ?? 40000,
  platform: payload.platform,
});

export const savedQueryDataSerializer = (payload: SavedScriptsFormData): SavedScriptsFormData =>
  // @ts-expect-error update types
  produce<SavedScriptsFormData>(payload, (draft: Draft<SavedQuerySOFormData>) => {
    if (isArray(draft.platform) && !draft.platform.length) {
      delete draft.platform;
    }

    return draft;
  });

export const useSavedQueryForm = ({ defaultValue }: UseSavedQueryFormProps) => {
  const { data } = useSavedScripts({});
  const ids: string[] = useMemo<string[]>(() => map(data?.data, 'id') ?? [], [data]);
  const idSet = useMemo<Set<string>>(() => {
    const res = new Set<string>(ids);
    if (defaultValue && defaultValue.id) res.delete(defaultValue.id);

    return res;
  }, [ids, defaultValue]);

  return {
    serializer: savedQueryDataSerializer,
    idSet,
    ...useHookForm<SavedScriptsFormData>({
      defaultValues: defaultValue
        ? deserializer(defaultValue)
        : {
            id: '',
            command: '',
            description: '',
            timeout: 40000,
          },
    }),
  };
};
