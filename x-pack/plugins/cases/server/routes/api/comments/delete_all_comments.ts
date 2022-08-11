/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { CASE_COMMENTS_URL } from '../../../../common/constants';
import { createCasesRoute } from '../create_cases_route';
import { createCaseError } from '../../../common/error';

export const deleteAllCommentsRoute = createCasesRoute({
  method: 'delete',
  path: CASE_COMMENTS_URL,
  params: {
    params: schema.object({
      case_id: schema.string(),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const client = await caseContext.getCasesClient();

      await client.attachments.deleteAll({
        caseID: request.params.case_id,
      });

      return response.noContent();
    } catch (error) {
      throw createCaseError({
        message: `Failed to delete all comments in route case id: ${request.params.case_id}: ${error}`,
        error,
      });
    }
  },
});
