/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { metricsApiV1 } from '../../../../common/types/api';

import { INTERNAL_CASE_METRICS_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';

export const getCasesMetricRoute = createCasesRoute({
  method: 'get',
  path: INTERNAL_CASE_METRICS_URL,
  routerOptions: {
    access: 'internal',
  },
  params: {
    query: schema.object({
      features: schema.oneOf([
        schema.arrayOf(schema.string({ minLength: 1 })),
        schema.string({ minLength: 1 }),
      ]),
      owner: schema.maybe(schema.oneOf([schema.arrayOf(schema.string()), schema.string()])),
      from: schema.maybe(schema.string()),
      to: schema.maybe(schema.string()),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const client = await caseContext.getCasesClient();
      const { features } = request.query as metricsApiV1.CasesMetricsRequest;

      const responseBody: metricsApiV1.CasesMetricsResponse = await client.metrics.getCasesMetrics({
        ...request.query,
        features: Array.isArray(features)
          ? (features as metricsApiV1.CasesMetricsFeatureField[])
          : [features as metricsApiV1.CasesMetricsFeatureField],
      });

      return response.ok({
        body: responseBody,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to get cases metrics in route: ${error}`,
        error,
      });
    }
  },
});
