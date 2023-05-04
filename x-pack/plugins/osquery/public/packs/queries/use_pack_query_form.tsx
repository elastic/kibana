/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArray, isEmpty, xor } from 'lodash';
import { useForm as useHookForm } from 'react-hook-form';
import type { Draft } from 'immer';
import { produce } from 'immer';
import { useMemo } from 'react';
import type { ECSMapping } from '@kbn/osquery-io-ts-types';
import type { Shard } from '../../../common/schemas/common/utils';

export interface UsePackQueryFormProps {
  uniqueQueryIds: string[];
  defaultValue?: PackSOQueryFormData | undefined;
}

export interface PackSOQueryFormData {
  id: string;
  query: string;
  interval: string;
  snapshot?: boolean;
  removed?: boolean;
  platform?: string | undefined;
  version?: string | undefined;
  ecs_mapping?: ECSMapping;
  shards: Shard;
}

export type PackQuerySOECSMapping = Array<{ field: string; value: string }>;

export interface PackQueryFormData {
  id: string;
  description?: string;
  query: string;
  interval: number;
  snapshot?: boolean;
  removed?: boolean;
  platform?: string | undefined;
  version?: string[] | undefined;
  ecs_mapping: ECSMapping;
}

const deserializer = (payload: PackSOQueryFormData): PackQueryFormData => ({
  id: payload.id,
  query: payload.query,
  interval: payload.interval ? parseInt(payload.interval, 10) : 3600,
  snapshot: payload.snapshot,
  removed: payload.removed,
  platform: payload.platform,
  version: payload.version ? [payload.version] : [],
  ecs_mapping: payload.ecs_mapping ?? {},
});

const serializer = (payload: PackQueryFormData): PackSOQueryFormData =>
  // @ts-expect-error update types
  produce<PackQueryFormData>(payload, (draft: Draft<PackSOQueryFormData>) => {
    if (isArray(draft.platform)) {
      if (draft.platform.length) {
        draft.platform.join(',');
      } else {
        delete draft.platform;
      }
    }

    if (isArray(draft.version)) {
      if (!draft.version.length) {
        delete draft.version;
      } else {
        draft.version = draft.version[0];
      }
    }

    if (draft.interval) {
      draft.interval = draft.interval + '';
    }

    if (isEmpty(draft.ecs_mapping)) {
      delete draft.ecs_mapping;
    }

    return draft;
  });

export const usePackQueryForm = ({ uniqueQueryIds, defaultValue }: UsePackQueryFormProps) => {
  const idSet = useMemo<Set<string>>(
    () => new Set<string>(xor(uniqueQueryIds, defaultValue?.id ? [defaultValue.id] : [])),
    [uniqueQueryIds, defaultValue]
  );

  return {
    serializer,
    idSet,
    ...useHookForm<PackQueryFormData>({
      defaultValues: defaultValue
        ? deserializer(defaultValue)
        : {
            id: '',
            query: '',
            interval: 3600,
            snapshot: true,
            removed: false,
          },
    }),
  };
};
