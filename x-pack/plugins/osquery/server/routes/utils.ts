/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reduce } from 'lodash';

export const convertECSMappingToArray = (ecsMapping: Record<string, object> | undefined) =>
  ecsMapping
    ? Object.entries(ecsMapping).map((item) => ({
        key: item[0],
        value: item[1],
      }))
    : undefined;

export const convertECSMappingToObject = (
  ecsMapping: Array<{ key: string; value: Record<string, object> }>
) =>
  reduce(
    ecsMapping,
    (acc, value) => {
      acc[value.key] = value.value;

      return acc;
    },
    {} as Record<string, { field?: string; value?: string }>
  );
