/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, map, reduce } from 'lodash';
import type { ECSMapping } from './schemas';

export const convertECSMappingToObject = (
  ecsMapping: Array<{
    key: string;
    result: {
      type: string;
      value: string;
    };
  }>
): ECSMapping =>
  reduce(
    ecsMapping,
    (acc, value) => {
      if (!isEmpty(value?.key) && !isEmpty(value.result?.type) && !isEmpty(value.result?.value)) {
        acc[value.key] = {
          [value.result.type]: value.result.value,
        };
      }

      return acc;
    },
    {} as Record<string, { field?: string; value?: string }>
  );

export type EcsMappingFormValueArray = Array<{
  key: string;
  result: {
    type: string;
    value: string;
  };
}>;
export const convertECSMappingToFormValue = (
  mapping?: Record<string, Record<'field', string>>
): EcsMappingFormValueArray =>
  map(mapping, (value, key) => ({
    key,
    result: {
      type: Object.keys(value)[0],
      value: Object.values(value)[0],
    },
  }));
