/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick, reduce } from 'lodash';

export const convertECSMappingToArray = (ecsMapping: Record<string, object> | undefined) =>
  ecsMapping
    ? Object.entries(ecsMapping).map((item) => ({
        value: item[0],
        ...item[1],
      }))
    : undefined;

export const convertECSMappingToObject = (ecsMapping: Array<{ field: string; value: string }>) =>
  reduce(
    ecsMapping,
    (acc, value) => {
      acc[value.value] = pick(value, 'field');
      return acc;
    },
    {} as Record<string, { field: string }>
  );
