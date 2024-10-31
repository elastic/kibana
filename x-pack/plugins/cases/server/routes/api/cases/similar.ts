/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASES_INTERNAL_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import type { caseApiV1 } from '../../../../common/types/api';

export const similarCaseRoute = createCasesRoute({
  method: 'post',
  path: `${CASES_INTERNAL_URL}/_similar`,
  routerOptions: {
    access: 'internal',
    summary: `Similar cases`,
    tags: ['oas-tag:cases'],
  },
  handler: async ({ context, request, response }) => {
    const options = request.body as caseApiV1.SimilarCasesSearchRequest;

    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();

      const res: caseApiV1.CasesSimilarResponse = await casesClient.cases.similar({ ...options });

      return response.ok({
        body: res,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to find similar cases in route for case with ID ${options.case_id}: ${error}`,
        error,
      });
    }
  },
});
