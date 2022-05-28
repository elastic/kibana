/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasePostRequest } from '../../../../common/api';
import { CASES_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';

export const postCaseRoute = createCasesRoute({
  method: 'post',
  path: CASES_URL,
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();
      const theCase = request.body as CasePostRequest;

      return response.ok({
        body: await casesClient.cases.create({ ...theCase }),
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to post case in route: ${error}`,
        error,
      });
    }
  },
});
