/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { caseApiV1 } from '@kbn/cases-common-types';
import { CASE_TAGS_URL } from '@kbn/cases-common-constants';
import { createCaseError } from '../../../../common/error';
import { createCasesRoute } from '../../create_cases_route';

export const getTagsRoute = createCasesRoute({
  method: 'get',
  path: CASE_TAGS_URL,
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
