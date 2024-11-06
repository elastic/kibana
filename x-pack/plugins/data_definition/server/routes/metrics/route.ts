/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { toElasticsearchQuery } from '@kbn/es-query';
import { fromKueryExpression } from '@kbn/es-query';
import { badRequest } from '@hapi/boom';
import kbnDatemath from '@kbn/datemath';
import { createDataDefinitionServerRoute } from '..';
import type { GetMetricDefinitionResult } from '../../../../data_definition_registry/server/data_definition_registry/types';

const getMetricsRoute = createDataDefinitionServerRoute({
  endpoint: 'POST /internal/data_definition/metrics',
  params: z.object({
    body: z.object({
      start: z.union([z.string(), z.number()]),
      end: z.union([z.string(), z.number()]),
      kuery: z.string().optional(),
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
    results: GetMetricDefinitionResult;
  }> => {
    const {
      request,
      plugins: { dataDefinitionRegistry },
      params: {
        body: { start, end, kuery, types = [] },
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

    const results = await registryClient.getMetricDefinitions({
      start: startAsNumber,
      end: endAsNumber,
      index: ['*', '*:*'],
      query: kuery ? toElasticsearchQuery(fromKueryExpression(kuery)) : { match_all: {} },
    });

    return { results };
  },
});

export const metricsRoutes = {
  ...getMetricsRoute,
};
