/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RouteDeps } from '.';
import { wrapError } from './utils';

export function initDeleteCommentApi({ caseService, router }: RouteDeps) {
  router.delete(
    {
      path: '/api/cases/comments/{comment_id}',
      validate: {
        params: schema.object({
          comment_id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const client = context.core.savedObjects.client;
      try {
        await caseService.deleteComment({
          client,
          commentId: request.params.comment_id,
        });
        return response.noContent();
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
