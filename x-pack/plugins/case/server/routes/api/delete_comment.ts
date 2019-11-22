/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RouteDeps } from '.';
import { formatUpdatedCase, wrapError } from './utils';

export function initDeleteCommentApi({ caseService, router }: RouteDeps) {
  router.delete(
    {
      path: '/api/cases/{case_id}/comments/{comment_id}',
      validate: {
        params: schema.object({
          case_id: schema.string(),
          comment_id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const client = context.core.savedObjects.client;
      let theCase;
      try {
        await caseService.deleteComment({
          client,
          commentId: request.params.comment_id,
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
      try {
        theCase = await caseService.getCase({
          client,
          caseId: request.params.case_id,
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
      try {
        const comments = theCase.attributes!.comments.filter(
          (comment: string) => comment !== request.params.comment_id
        );
        const updatedCase = await caseService.updateCase({
          client: context.core.savedObjects.client,
          caseId: request.params.case_id,
          updatedAttributes: formatUpdatedCase({ comments }),
        });
        return response.ok({ body: { deleted: true, updatedCase } });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
