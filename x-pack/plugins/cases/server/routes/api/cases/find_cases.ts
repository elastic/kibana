/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesFindRequest } from '../../../../common/api';
import { CASES_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';

export const findCaseRoute = createCasesRoute({
  method: 'get',
  path: `${CASES_URL}/_find`,
  handler: async ({ context, request, response }) => {
    try {
      if (!context.cases) {
        return response.badRequest({ body: 'RouteHandlerContext is not registered for cases' });
      }
      const casesClient = await context.cases.getCasesClient();
      const options = request.query as CasesFindRequest;

      return response.ok({
        body: await casesClient.cases.find({ ...options }),
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to find cases in route: ${error}`,
        error,
      });
    }
  },
});
