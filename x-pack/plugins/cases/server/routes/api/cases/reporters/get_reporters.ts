/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteDeps } from '../../types';
import { wrapError, escapeHatch } from '../../utils';
import { CASE_REPORTERS_URL } from '../../../../../common/constants';
import { AllReportersFindRequest } from '../../../../../common/api';

export function initGetReportersApi({ router, logger }: RouteDeps) {
  router.get(
    {
      path: CASE_REPORTERS_URL,
      validate: {
        query: escapeHatch,
      },
    },
    async (context, request, response) => {
      try {
        if (!context.cases) {
          return response.badRequest({ body: 'RouteHandlerContext is not registered for cases' });
        }

        const client = await context.cases.getCasesClient();
        const options = request.query as AllReportersFindRequest;

        return response.ok({ body: await client.cases.getReporters({ ...options }) });
      } catch (error) {
        logger.error(`Failed to get reporters in route: ${error}`);
        return response.customError(wrapError(error));
      }
    }
  );
}
