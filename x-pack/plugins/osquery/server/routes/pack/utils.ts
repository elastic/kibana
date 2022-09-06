/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick, reduce } from 'lodash';
import { removeMultilines } from '../../../common/utils/build_query/remove_multilines';
import { convertECSMappingToArray, convertECSMappingToObject } from '../utils';

// @ts-expect-error update types
export const convertPackQueriesToSO = (queries) =>
  reduce(
    queries,
    (acc, value, key: string) => {
      const ecsMapping = value.ecs_mapping && convertECSMappingToArray(value.ecs_mapping);
      acc.push({
        id: key,
        ...pick(value, ['name', 'query', 'interval', 'platform', 'version']),
        ...(ecsMapping ? { ecs_mapping: ecsMapping } : {}),
      });

      return acc;
    },
    [] as Array<{
      id: string;
      name: string;
      query: string;
      interval: number;
      ecs_mapping?: Record<string, unknown>;
    }>
  );

// @ts-expect-error update types
export const convertSOQueriesToPack = (queries, options?: { removeMultiLines?: boolean }) =>
  reduce(
    queries,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    (acc, { id: queryId, ecs_mapping, query, ...rest }, key) => {
      const index = queryId ? queryId : key;
      acc[index] = {
        ...rest,
        query: options?.removeMultiLines ? removeMultilines(query) : query,
        ecs_mapping: convertECSMappingToObject(ecs_mapping),
      };

      return acc;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    {} as Record<string, any>
  );
