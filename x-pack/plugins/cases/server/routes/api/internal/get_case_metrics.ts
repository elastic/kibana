/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { metricsApiV1 } from '../../../../common/types/api';

import { INTERNAL_CASE_METRICS_DETAILS_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';

export const getCaseMetricRoute = createCasesRoute({
  method: 'get',
  path: INTERNAL_CASE_METRICS_DETAILS_URL,
  params: {
    params: schema.object({
      case_id: schema.string({ minLength: 1 }),
    }),
    query: schema.object({
      features: schema.oneOf([
        schema.arrayOf(schema.string({ minLength: 1 })),
        schema.string({ minLength: 1 }),
      ]),
    }),
  },
  routerOptions: {
    access: 'internal',
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const client = await caseContext.getCasesClient();
      const { features } = request.query as metricsApiV1.SingleCaseMetricsRequest;

      const responseBody: metricsApiV1.SingleCaseMetricsResponse =
        await client.metrics.getCaseMetrics({
          caseId: request.params.case_id,
          features: Array.isArray(features)
            ? (features as metricsApiV1.SingleCaseMetricsFeatureField[])
            : [features as metricsApiV1.SingleCaseMetricsFeatureField],
        });

      return response.ok({
        body: responseBody,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to get case metrics in route: ${error}`,
        error,
      });
    }
  },
});
