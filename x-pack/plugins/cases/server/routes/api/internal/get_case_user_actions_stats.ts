/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import type { userActionApiV1 } from '../../../../common/types/api';
import { INTERNAL_GET_CASE_USER_ACTIONS_STATS_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';

export const getCaseUserActionStatsRoute = createCasesRoute({
  method: 'get',
  path: INTERNAL_GET_CASE_USER_ACTIONS_STATS_URL,
  params: {
    params: schema.object({
      case_id: schema.string(),
    }),
  },
  routerOptions: {
    access: 'internal',
  },
  handler: async ({ context, request, response }) => {
    try {
      const casesContext = await context.cases;
      const casesClient = await casesContext.getCasesClient();
      const caseId = request.params.case_id;

      const res: userActionApiV1.CaseUserActionStatsResponse = await casesClient.userActions.stats({
        caseId,
      });

      return response.ok({
        body: res,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to retrieve stats in route case id: ${request.params.case_id}: ${error}`,
        error,
      });
    }
  },
});
