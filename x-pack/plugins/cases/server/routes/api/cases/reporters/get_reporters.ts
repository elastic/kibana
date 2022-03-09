/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AllReportersFindRequest } from '../../../../../common/api';
import { CASE_REPORTERS_URL } from '../../../../../common/constants';
import { createCaseError } from '../../../../common/error';
import { createCasesRoute } from '../../create_cases_route';

export const getReportersRoute = createCasesRoute({
  method: 'get',
  path: CASE_REPORTERS_URL,
  handler: async ({ context, request, response }) => {
    try {
      const client = await context.cases.getCasesClient();
      const options = request.query as AllReportersFindRequest;

      return response.ok({ body: await client.cases.getReporters({ ...options }) });
    } catch (error) {
      throw createCaseError({
        message: `Failed to find cases in route: ${error}`,
        error,
      });
    }
  },
});
