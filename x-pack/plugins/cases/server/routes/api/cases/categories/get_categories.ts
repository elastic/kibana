/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AllCategoriesFindRequest } from '../../../../../common/api';

import { INTERNAL_GET_CASE_CATEGORIES_URL } from '../../../../../common/constants';
import { createCaseError } from '../../../../common/error';
import { createCasesRoute } from '../../create_cases_route';

export const getCategoriesRoute = createCasesRoute({
  method: 'get',
  path: INTERNAL_GET_CASE_CATEGORIES_URL,
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const client = await caseContext.getCasesClient();
      const options = request.query as AllCategoriesFindRequest;

      return response.ok({ body: await client.cases.getCategories(options) });
    } catch (error) {
      throw createCaseError({
        message: `Failed to retrieve categories in route: ${error}`,
        error,
      });
    }
  },
});
