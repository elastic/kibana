/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { CASE_COMMENTS_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';

/**
 * @deprecated since version 8.1.0
 */
export const getAllCommentsRoute = createCasesRoute({
  method: 'get',
  path: CASE_COMMENTS_URL,
  params: {
    params: schema.object({
      case_id: schema.string(),
    }),
  },
  options: { deprecated: true },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const client = await caseContext.getCasesClient();

      return response.ok({
        body: await client.attachments.getAll({
          caseID: request.params.case_id,
        }),
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to get all comments in route case id: ${request.params.case_id}: ${error}`,
        error,
      });
    }
  },
});
