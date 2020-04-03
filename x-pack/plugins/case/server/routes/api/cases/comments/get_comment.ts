/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

import { CommentResponseRt } from '../../../../../common/api';
import { RouteDeps } from '../../types';
import { flattenCommentSavedObject, wrapError } from '../../utils';

export function initGetCommentApi({ caseService, router }: RouteDeps) {
  router.get(
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
      try {
        const client = context.core.savedObjects.client;

        const comment = await caseService.getComment({
          client,
          commentId: request.params.comment_id,
        });
        return response.ok({
          body: CommentResponseRt.encode(flattenCommentSavedObject(comment)),
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
