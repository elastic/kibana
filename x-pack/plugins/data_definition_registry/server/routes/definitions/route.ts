/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import datemath from '@elastic/datemath';
import { createDataDefinitionRegistryServerRoute } from '../create_data_definition_registry_server_route';

const relativeOrAbsolute = (options?: { roundUp?: boolean }) =>
  z.union([z.string(), z.number()]).transform((value, context) => {
    if (typeof value === 'string') {
      const parsed = datemath.parse(value, { roundUp: options?.roundUp ?? false })?.valueOf();
      if (!parsed) {
        throw new Error(`Failed to parse date ${value}`);
      }
      return parsed;
    }
    return value;
  });

const getAssetsRoute = createDataDefinitionRegistryServerRoute({
  endpoint: 'GET /internal/data_definition/assets',
  params: z.object({
    query: z.object({
      start: relativeOrAbsolute(),
      end: relativeOrAbsolute({ roundUp: true }),
      kuery: z.string().optional(),
      index: z.union([z.string(), z.array(z.string())]).optional(),
    }),
  }),
  options: {
    tags: ['access:dataDefinitionRegistry'],
  },
  handler: async ({ params, registry, request }) => {
    const client = await registry.getClientWithRequest(request);

    const {
      query: { start, end, index, kuery },
    } = params;

    return client.getAssets({
      start,
      end,
      index: index ?? ['*', '*:*'],
      query: {
        bool: {
          filter: [
            kuery ? { kql: { query: kuery } } : { match_all: {} },
            {
              range: {
                '@timestamp': {
                  gte: start,
                  lte: end,
                  format: 'epoch_millis',
                },
              },
            },
          ],
        },
      },
    });
  },
});

const getQueriesRoute = createDataDefinitionRegistryServerRoute({
  endpoint: 'GET /internal/data_definition/queries',
  params: z.object({
    query: z.object({
      start: relativeOrAbsolute(),
      end: relativeOrAbsolute({ roundUp: true }),
      kuery: z.string().optional(),
      index: z.union([z.string(), z.array(z.string())]).optional(),
    }),
  }),
  options: {
    tags: ['access:dataDefinitionRegistry'],
  },
  handler: async ({ params, registry, request }) => {
    const client = await registry.getClientWithRequest(request);

    const {
      query: { start, end, index, kuery },
    } = params;

    const queries = await client.getQueries({
      start,
      end,
      index: index ?? ['*', '*:*'],
      query: {
        bool: {
          filter: [
            kuery ? { kql: { query: kuery } } : { match_all: {} },
            {
              range: {
                '@timestamp': {
                  gte: start,
                  lte: end,
                  format: 'epoch_millis',
                },
              },
            },
          ],
        },
      },
    });

    return queries;
  },
});

export const definitionsRoutes = {
  ...getAssetsRoute,
  ...getQueriesRoute,
};
