/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { CASE_METRICS_DETAILS_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';

export const getCaseMetricRoute = createCasesRoute({
  method: 'get',
  path: CASE_METRICS_DETAILS_URL,
  params: {
    params: schema.object({
      case_id: schema.string({ minLength: 1 }),
    }),
    query: schema.object({
      features: schema.arrayOf(schema.string({ minLength: 1 })),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const client = await caseContext.getCasesClient();
      return response.ok({
        body: await client.metrics.getCaseMetrics({
          caseId: request.params.case_id,
          features: request.query.features,
        }),
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to get case metrics in route: ${error}`,
        error,
      });
    }
  },
});
