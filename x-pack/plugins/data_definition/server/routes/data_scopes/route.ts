/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { createDataDefinitionServerRoute } from '..';
import {
  DataDefinitionScope,
  DataDefinitionSource,
} from '../../../../data_definition_registry/server';

const getDataScopesRoute = createDataDefinitionServerRoute({
  endpoint: 'POST /internal/data_definition/data_scopes',
  params: z.object({
    body: z.object({
      start: z.number(),
      end: z.number(),
      types: z
        .array(z.union([z.literal('slo'), z.literal('rule'), z.literal('visualization')]))
        .optional(),
    }),
  }),
  options: {
    tags: ['access:dataDefinition'],
  },
  handler: async (
    context
  ): Promise<{
    results: Array<{ source?: DataDefinitionSource; scope: DataDefinitionScope }>;
  }> => {
    const {
      request,
      plugins: { dataDefinitionRegistry },
      params: {
        body: { start, end, types = [] },
      },
    } = context;

    const registryClient = (await dataDefinitionRegistry.start()).getClientWithRequest(request);

    const results = await registryClient.getDataScopes([], {
      start,
      end,
      query: {
        match_all: {},
      },
    });

    return { results };
  },
});

export const dataScopesRoutes = {
  ...getDataScopesRoute,
};
