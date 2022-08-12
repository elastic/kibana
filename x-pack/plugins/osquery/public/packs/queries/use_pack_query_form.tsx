/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArray, isEmpty, map, xor } from 'lodash';

import { useForm as useHookForm } from 'react-hook-form';
import { produce } from 'immer';
import { useMemo } from 'react';
import { convertECSMappingToObject } from '../../../common/schemas/common/utils';
import type { EcsMappingFormField } from './ecs_mapping_editor_field';
import { defaultEcsFormData } from './ecs_mapping_editor_field';

export interface UsePackQueryFormProps {
  uniqueQueryIds: string[];
  defaultValue?: PackSOQueryFormData | undefined;
}

export interface PackSOQueryFormData {
  id: string;
  query: string;
  interval: number;
  platform?: string | undefined;
  version?: string | undefined;
  ecs_mapping: PackQuerySOECSMapping[] | undefined;
}

export type PackQuerySOECSMapping = Array<{ field: string; value: string }>;

export interface PackQueryFormData {
  id: string;
  description?: string;
  query: string;
  interval: number;
  platform?: string | undefined;
  version?: string | string[] | undefined;
  ecs_mapping: EcsMappingFormField[];
}

export type PackQueryECSMapping = Record<
  string,
  {
    field?: string;
    value?: string;
  }
>;

const deserializer = (payload: PackSOQueryFormData): PackQueryFormData => ({
  id: payload.id,
  query: payload.query,
  interval: payload.interval,
  platform: payload.platform,
  version: payload.version ? [payload.version] : [],
  ecs_mapping: !isEmpty(payload.ecs_mapping)
    ? (map(payload.ecs_mapping, (value: { field: string }, key: string) => {
        const name = Object.keys(value)[0] as string;

        return {
          key,
          result: {
            type: name,
            value: name,
          },
        };
      }) as unknown as EcsMappingFormField[])
    : [defaultEcsFormData],
});

const serializer = (payload: PackQueryFormData): PackSOQueryFormData =>
  // @ts-expect-error update types
  produce(payload, (draft) => {
    if (isArray(draft.platform)) {
      draft.platform.join(',');
    }

    if (isArray(draft.version)) {
      if (!draft.version.length) {
        delete draft.version;
      } else {
        draft.version = draft.version[0];
      }
    }

    if (typeof draft.interval === 'string') {
      draft.interval = parseInt(draft.interval, 10);
    }

    if (isEmpty(draft.ecs_mapping)) {
      // @ts-expect-error update types
      delete draft.ecs_mapping;
    } else {
      // @ts-expect-error update types
      draft.ecs_mapping = convertECSMappingToObject(payload.ecs_mapping);
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
            ecs_mapping: [defaultEcsFormData],
          },
    }),
  };
};
