/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { escapeHatch, wrapError } from '../../utils';
import { RouteDeps } from '../../types';
import { CASE_COMMENTS_URL } from '../../../../../common/constants';
import { CommentRequest } from '../../../../../common/api';

export function initPostCommentApi({ router }: RouteDeps) {
  router.post(
    {
      path: CASE_COMMENTS_URL,
      validate: {
        params: schema.object({
          case_id: schema.string(),
        }),
        body: escapeHatch,
      },
    },
    async (context, request, response) => {
      if (!context.case) {
        return response.badRequest({ body: 'RouteHandlerContext is not registered for cases' });
      }

      const caseClient = context.case.getCaseClient();
      const caseId = request.params.case_id;
      const comment = request.body as CommentRequest;

      try {
        return response.ok({
          body: await caseClient.addComment({ caseId, comment }),
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
