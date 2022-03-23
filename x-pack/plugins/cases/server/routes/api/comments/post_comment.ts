/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { CASE_COMMENTS_URL } from '../../../../common/constants';
import { CommentRequest } from '../../../../common/api';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';

export const postCommentRoute = createCasesRoute({
  method: 'post',
  path: CASE_COMMENTS_URL,
  params: {
    params: schema.object({
      case_id: schema.string(),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const casesClient = await context.cases.getCasesClient();
      const caseId = request.params.case_id;
      const comment = request.body as CommentRequest;

      return response.ok({
        body: await casesClient.attachments.add({ caseId, comment }),
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to post comment in route case id: ${request.params.case_id}: ${error}`,
        error,
      });
    }
  },
});
