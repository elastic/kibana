/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import type { GetDataScopeResult } from '@kbn/data-definition-registry-plugin/server';
import kbnDatemath from '@kbn/datemath';
import { z } from '@kbn/zod';
import { createDataDefinitionServerRoute } from '..';

const getDataScopesRoute = createDataDefinitionServerRoute({
  endpoint: 'POST /internal/data_definition/data_scopes',
  params: z.object({
    body: z.object({
      start: z.union([z.string(), z.number()]),
      end: z.union([z.string(), z.number()]),
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
    results: GetDataScopeResult;
  }> => {
    const {
      request,
      plugins: { dataDefinitionRegistry },
      params: {
        body: { start, end, types = [] },
      },
    } = context;

    const registryClient = await (
      await dataDefinitionRegistry.start()
    ).getClientWithRequest(request);

    const startAsNumber = typeof start === 'string' ? kbnDatemath.parse(start)?.valueOf() : start;
    const endAsNumber = typeof end === 'string' ? kbnDatemath.parse(end)?.valueOf() : end;

    if (startAsNumber === undefined || endAsNumber === undefined) {
      throw badRequest(`Start/end not valid: ${JSON.stringify({ start, end })}`);
    }

    const results = await registryClient.getScopes({
      start: startAsNumber,
      end: endAsNumber,
      query: {
        match_all: {},
      },
      index: ['*:*', '*'],
    });

    return { results };
  },
});

export const dataScopesRoutes = {
  ...getDataScopesRoute,
};
