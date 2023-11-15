/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';

import { CASES_INTERNAL_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import type { caseApiV1 } from '../../../../common/types/api';

export const searchCasesRoute = createCasesRoute({
  method: 'post',
  path: `${CASES_INTERNAL_URL}/_search`,
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();

      const options = request.body as caseApiV1.CasesSearchRequest;

      /**
       * throw error if request body does not have owner
       */
      if (!Object.hasOwn(options, 'owner')) {
        throw Boom.badRequest('Owner is required.');
      }

      const res: caseApiV1.CasesFindResponse = await casesClient.cases.search({ ...options });

      return response.ok({
        body: res,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to find cases in route: ${error}`,
        error,
      });
    }
  },
});
