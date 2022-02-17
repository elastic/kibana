/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDeps } from '../types';
import { wrapError } from '../utils';

import { CASE_METRICS_DETAILS_URL } from '../../../../common/constants';

export function initGetCaseMetricsApi({ router, logger }: RouteDeps) {
  router.get(
    {
      path: CASE_METRICS_DETAILS_URL,
      validate: {
        params: schema.object({
          case_id: schema.string({ minLength: 1 }),
        }),
        query: schema.object({
          features: schema.arrayOf(schema.string({ minLength: 1 })),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const client = await context.cases.getCasesClient();
        return response.ok({
          body: await client.metrics.getCaseMetrics({
            caseId: request.params.case_id,
            features: request.query.features,
          }),
        });
      } catch (error) {
        logger.error(`Failed to get case metrics in route: ${error}`);
        return response.customError(wrapError(error));
      }
    }
  );
}
