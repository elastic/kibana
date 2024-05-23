/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_TAGS_URL } from '../../../../../common/constants';
import { createCaseError } from '../../../../common/error';
import { createCasesRoute } from '../../create_cases_route';
import type { caseApiV1 } from '../../../../../common/types/api';

export const getTagsRoute = createCasesRoute({
  method: 'get',
  path: CASE_TAGS_URL,
  routerOptions: {
    access: 'public',
    description: `Get case tags`,
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const client = await caseContext.getCasesClient();
      const options = request.query as caseApiV1.AllTagsFindRequest;

      const res: caseApiV1.GetTagsResponse = await client.cases.getTags({ ...options });

      return response.ok({ body: res });
    } catch (error) {
      throw createCaseError({
        message: `Failed to retrieve tags in route: ${error}`,
        error,
      });
    }
  },
});
