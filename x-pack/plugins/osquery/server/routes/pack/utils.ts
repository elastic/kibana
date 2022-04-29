/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick, reduce } from 'lodash';
import { convertECSMappingToArray, convertECSMappingToObject } from '../utils';

// @ts-expect-error update types
export const convertPackQueriesToSO = (queries) =>
  reduce(
    queries,
    (acc, value, key) => {
      const ecsMapping = value.ecs_mapping && convertECSMappingToArray(value.ecs_mapping);
      acc.push({
        id: key,
        ...pick(value, ['query', 'interval', 'platform', 'version']),
        ...(ecsMapping ? { ecs_mapping: ecsMapping } : {}),
      });

      return acc;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [] as Array<Record<string, any>>
  );

// @ts-expect-error update types
export const convertSOQueriesToPack = (queries, removeMultiLines?: boolean) =>
  reduce(
    queries,
    (acc, value, key) => {
      const index = value.id ? value.id : key;
      acc[index] = {
        ...value,
        query: removeMultiLines
          ? value.query.replaceAll('\n', ' ').replaceAll('  ', ' ')
          : value.query,
        ecs_mapping: convertECSMappingToObject(value.ecs_mapping),
      };

      return acc;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    {} as Record<string, any>
  );
