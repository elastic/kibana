/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick, reduce } from 'lodash';

// @ts-expect-error update types
export const convertPackQueriesToSO = (queries) =>
  reduce(
    queries,
    (acc, value, key) => {
      acc.push({
        // @ts-expect-error update types
        id: key,
        ...pick(value, ['query', 'interval', 'platform', 'version', 'ecs_mapping']),
      });

      return acc;
    },
    []
  );

// @ts-expect-error update types
export const convertSOQueriesToPack = (queries) =>
  reduce(
    queries,
    (acc, { id: queryId, ...query }) => {
      acc[queryId] = query;

      return acc;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    {} as Record<string, any>
  );
