/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASES_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import type { caseApiV1 } from '../../../../common/types/api';
import type { caseDomainV1 } from '../../../../common/types/domain';

export const postCaseRoute = createCasesRoute({
  method: 'post',
  path: CASES_URL,
  routerOptions: {
    access: 'public',
    summary: `Create a case`,
    tags: ['oas-tag:cases'],
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();
      const theCase = request.body as caseApiV1.CasePostRequest;

      const res: caseDomainV1.Case = await casesClient.cases.create({ ...theCase });

      return response.ok({
        body: res,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to post case in route: ${error}`,
        error,
      });
    }
  },
});
