/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { CASE_COMMENT_DETAILS_URL } from '../../../../common/constants';
import { createCasesRoute } from '../create_cases_route';
import { createCaseError } from '../../../common/error';

export const deleteCommentRoute = createCasesRoute({
  method: 'delete',
  path: CASE_COMMENT_DETAILS_URL,
  params: {
    params: schema.object({
      case_id: schema.string(),
      comment_id: schema.string(),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const client = await caseContext.getCasesClient();
      await client.attachments.delete({
        attachmentID: request.params.comment_id,
        caseID: request.params.case_id,
      });

      return response.noContent();
    } catch (error) {
      throw createCaseError({
        message: `Failed to delete comment in route case id: ${request.params.case_id} comment id: ${request.params.comment_id}: ${error}`,
        error,
      });
    }
  },
});
