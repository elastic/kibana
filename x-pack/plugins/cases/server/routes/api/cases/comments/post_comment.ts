/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { escapeHatch, wrapError } from '../../utils';
import { RouteDeps } from '../../types';
import { CASE_COMMENTS_URL } from '../../../../../common/constants';
import { CommentRequest } from '../../../../../common/api';

export function initPostCommentApi({ router, logger }: RouteDeps) {
  router.post(
    {
      path: CASE_COMMENTS_URL,
      validate: {
        params: schema.object({
          case_id: schema.string(),
        }),
        query: schema.maybe(
          schema.object({
            subCaseId: schema.maybe(schema.string()),
          })
        ),
        body: escapeHatch,
      },
    },
    async (context, request, response) => {
      if (!context.cases) {
        return response.badRequest({ body: 'RouteHandlerContext is not registered for cases' });
      }

      const casesClient = context.cases.getCasesClient();
      const caseId = request.query?.subCaseId ?? request.params.case_id;
      const comment = request.body as CommentRequest;

      try {
        return response.ok({
          body: await casesClient.addComment({ caseId, comment }),
        });
      } catch (error) {
        logger.error(
          `Failed to post comment in route case id: ${request.params.case_id} sub case id: ${request.query?.subCaseId}: ${error}`
        );
        return response.customError(wrapError(error));
      }
    }
  );
}
