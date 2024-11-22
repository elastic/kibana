/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_REPORTERS_URL } from '../../../../../common/constants';
import { createCaseError } from '../../../../common/error';
import { createCasesRoute } from '../../create_cases_route';
import type { caseApiV1 } from '../../../../../common/types/api';

export const getReportersRoute = createCasesRoute({
  method: 'get',
  path: CASE_REPORTERS_URL,
  routerOptions: {
    access: 'public',
    summary: `Get case creators`,
    tags: ['oas-tag:cases'],
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const client = await caseContext.getCasesClient();
      const options = request.query as caseApiV1.AllReportersFindRequest;

      const res: caseApiV1.GetReportersResponse = await client.cases.getReporters({ ...options });

      return response.ok({ body: res });
    } catch (error) {
      throw createCaseError({
        message: `Failed to find cases in route: ${error}`,
        error,
      });
    }
  },
});
