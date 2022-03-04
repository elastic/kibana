/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { CASE_USER_ACTIONS_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';

/**
 * @deprecated since version 8.1.0
 */
export const getUserActionsRoute = createCasesRoute({
  method: 'get',
  path: CASE_USER_ACTIONS_URL,
  params: {
    params: schema.object({
      case_id: schema.string(),
    }),
  },
  options: { deprecated: true },
  handler: async ({ context, request, response, logger, kibanaVersion }) => {
    try {
      const casesClient = await context.cases.getCasesClient();
      const caseId = request.params.case_id;

      return response.ok({
        body: await casesClient.userActions.getAll({ caseId }),
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to retrieve case user actions in route case id: ${request.params.case_id}: ${error}`,
        error,
      });
    }
  },
});
