/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { CASE_FIND_USER_ACTIONS_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import type { UserActionFindRequest } from '../../../../common/api';

export const findUserActionsRoute = createCasesRoute({
  method: 'get',
  path: CASE_FIND_USER_ACTIONS_URL,
  params: {
    params: schema.object({
      case_id: schema.string(),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();
      const caseId = request.params.case_id;
      const options = request.query as UserActionFindRequest;

      return response.ok({
        body: await casesClient.userActions.find({ caseId, params: options }),
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to find user actions in route for case id: ${request.params.case_id}: ${error}`,
        error,
      });
    }
  },
});
