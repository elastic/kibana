/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, reduce } from 'lodash';

export const convertECSMappingToArray = (ecsMapping: Record<string, object> | undefined) =>
  ecsMapping
    ? Object.entries(ecsMapping).map((item) => ({
        key: item[0],
        value: item[1],
      }))
    : undefined;

export const convertECSMappingToObject = (
  ecsMapping: Array<{
    key: string;
    result: {
      type: string;
      value: string;
    };
  }>
): Record<string, { field?: string; value?: string }> =>
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
