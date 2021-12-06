/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteDeps } from '../types';
import { escapeHatch, wrapError } from '../utils';

import { CasesStatusRequest } from '../../../../common/api';
import { CASE_STATUS_URL } from '../../../../common/constants';

export function initGetCasesStatusApi({ router, logger }: RouteDeps) {
  router.get(
    {
      path: CASE_STATUS_URL,
      validate: { query: escapeHatch },
    },
    async (context, request, response) => {
      try {
        const client = await context.cases.getCasesClient();
        return response.ok({
          body: await client.stats.getStatusTotalsByType(request.query as CasesStatusRequest),
        });
      } catch (error) {
        logger.error(`Failed to get status stats in route: ${error}`);
        return response.customError(wrapError(error));
      }
    }
  );
}
