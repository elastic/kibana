/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { caseDomainV1, caseApiV1 } from '@kbn/cases-common-types';
import { CASES_URL } from '@kbn/cases-common-constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';

export const patchCaseRoute = createCasesRoute({
  method: 'patch',
  path: CASES_URL,
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();
      const cases = request.body as caseApiV1.CasesPatchRequest;

      const res: caseDomainV1.Cases = await casesClient.cases.update(cases);

      return response.ok({
        body: res,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to patch cases in route: ${error}`,
        error,
      });
    }
  },
});
