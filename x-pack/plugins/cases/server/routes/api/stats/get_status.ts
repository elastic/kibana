/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { statsApiV1 } from '@kbn/cases-common-types';
import { CASE_STATUS_URL } from '@kbn/cases-common-constants';
import type { CaseRoute } from '../types';

import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';

/**
 * @deprecated since version 8.1.0
 */
export const getStatusRoute: CaseRoute = createCasesRoute({
  method: 'get',
  path: CASE_STATUS_URL,
  options: { deprecated: true },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const client = await caseContext.getCasesClient();

      const res: statsApiV1.CasesStatusResponse = await client.metrics.getStatusTotalsByType(
        request.query as statsApiV1.CasesStatusRequest
      );

      return response.ok({
        body: res,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to get status stats in route: ${error}`,
        error,
      });
    }
  },
});
