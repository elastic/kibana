/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { INTERNAL_CASE_USERS_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';

export const getUsersRoute = createCasesRoute({
  method: 'get',
  path: INTERNAL_CASE_USERS_URL,
  params: {
    params: schema.object({
      case_id: schema.string(),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const casesContext = await context.cases;
      const casesClient = await casesContext.getCasesClient();
      const caseId = request.params.case_id;

      return response.ok({
        body: await casesClient.userActions.getUsers({ caseId }),
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to retrieve users in route case id: ${request.params.case_id}: ${error}`,
        error,
      });
    }
  },
});
