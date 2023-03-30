/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useForm as useHookForm } from 'react-hook-form';
import { isArray, isEmpty, map } from 'lodash';
import type { Draft } from 'immer';
import produce from 'immer';
import { useMemo } from 'react';
import type { ECSMapping } from '@kbn/osquery-io-ts-types';
import { useSavedQueries } from '../use_saved_queries';

export interface SavedQuerySOFormData {
  id?: string;
  description?: string;
  query?: string;
  interval?: string;
  snapshot?: boolean;
  removed?: boolean;
  platform?: string;
  version?: string | undefined;
  ecs_mapping?: ECSMapping | undefined;
}

export interface SavedQueryFormData {
  id?: string;
  description?: string;
  query?: string;
  interval?: number;
  snapshot?: boolean;
  removed?: boolean;
  platform?: string;
  version?: string[];
  ecs_mapping: ECSMapping | undefined;
}

interface UseSavedQueryFormProps {
  defaultValue?: SavedQuerySOFormData;
}

const deserializer = (payload: SavedQuerySOFormData): SavedQueryFormData => ({
  id: payload.id,
  description: payload.description,
  query: payload.query,
  interval: payload.interval ? parseInt(payload.interval, 10) : 3600,
  snapshot: payload.snapshot ?? true,
  removed: payload.removed ?? false,
  platform: payload.platform,
  version: payload.version ? [payload.version] : [],
  ecs_mapping: !isEmpty(payload.ecs_mapping) ? payload.ecs_mapping : {},
});

export const savedQueryDataSerializer = (payload: SavedQueryFormData): SavedQuerySOFormData =>
  // @ts-expect-error update types
  produce<SavedQueryFormData>(payload, (draft: Draft<SavedQuerySOFormData>) => {
    if (isArray(draft.version)) {
      if (!draft.version.length) {
        draft.version = '';
      } else {
        draft.version = draft.version[0];
      }
    }

    if (isArray(draft.platform) && !draft.platform.length) {
      delete draft.platform;
    }

    if (draft.interval) {
      draft.interval = draft.interval + '';
    }

    return draft;
  });

export const useSavedQueryForm = ({ defaultValue }: UseSavedQueryFormProps) => {
  const { data } = useSavedQueries({});
  const ids: string[] = useMemo<string[]>(() => map(data?.data, 'attributes.id') ?? [], [data]);
  const idSet = useMemo<Set<string>>(() => {
    const res = new Set<string>(ids);
    if (defaultValue && defaultValue.id) res.delete(defaultValue.id);

    return res;
  }, [ids, defaultValue]);

  return {
    serializer: savedQueryDataSerializer,
    idSet,
    ...useHookForm<SavedQueryFormData>({
      defaultValues: defaultValue
        ? deserializer(defaultValue)
        : {
            id: '',
            query: '',
            interval: 3600,
            ecs_mapping: {},
            snapshot: true,
          },
    }),
  };
};
