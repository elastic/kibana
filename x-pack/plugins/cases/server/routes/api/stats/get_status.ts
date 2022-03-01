/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteDeps } from '../types';
import { escapeHatch, wrapError, getWarningHeader, logDeprecatedEndpoint } from '../utils';

import { CasesStatusRequest } from '../../../../common/api';
import { CASE_STATUS_URL } from '../../../../common/constants';

/**
 * @deprecated since version 8.1.0
 */
export function initGetCasesStatusApi({ router, logger, kibanaVersion }: RouteDeps) {
  router.get(
    {
      path: CASE_STATUS_URL,
      validate: { query: escapeHatch },
    },
    async (context, request, response) => {
      try {
        logDeprecatedEndpoint(
          logger,
          request.headers,
          `The get cases status API '${CASE_STATUS_URL}' is deprecated.`
        );

        const client = await context.cases.getCasesClient();
        return response.ok({
          headers: {
            ...getWarningHeader(kibanaVersion),
          },
          body: await client.metrics.getStatusTotalsByType(request.query as CasesStatusRequest),
        });
      } catch (error) {
        logger.error(`Failed to get status stats in route: ${error}`);
        return response.customError(wrapError(error));
      }
    }
  );
}
