/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseRoute } from '../types';
import { getWarningHeader, logDeprecatedEndpoint } from '../utils';

import { CasesStatusRequest } from '../../../../common/api';
import { CASE_STATUS_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';

/**
 * @deprecated since version 8.1.0
 */
export const getStatusRoute: CaseRoute = createCasesRoute({
  method: 'get',
  path: CASE_STATUS_URL,
  handler: async ({ context, request, response, logger, kibanaVersion }) => {
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
      throw createCaseError({
        message: `Failed to get status stats in route: ${error}`,
        error,
      });
    }
  },
});
