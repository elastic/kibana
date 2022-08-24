/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AllAssigneesFindRequest } from '../../../../common/api';
import { CASE_ASSIGNEES_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';

export const getAssigneesRoute = createCasesRoute({
  method: 'get',
  path: CASE_ASSIGNEES_URL,
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const client = await caseContext.getCasesClient();
      const options = request.query as AllAssigneesFindRequest;

      return response.ok({ body: await client.cases.getAssignees({ ...options }) });
    } catch (error) {
      throw createCaseError({
        message: `Failed to find assignees in route: ${error}`,
        error,
      });
    }
  },
});
