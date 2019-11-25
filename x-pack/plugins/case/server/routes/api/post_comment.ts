/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { formatNewComment, wrapError } from './utils';
import { NewCommentSchema } from './schema';
import { RouteDeps } from '.';

export function initPostCommentApi({ caseService, router }: RouteDeps) {
  router.post(
    {
      path: '/api/cases/{id}/comment',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: NewCommentSchema,
      },
    },
    async (context, request, response) => {
      let user;
      let newComment;
      try {
        user = await caseService.getUser({ request, response });
      } catch (e) {
        return e;
      }
      try {
        newComment = await caseService.postNewComment({
          client: context.core.savedObjects.client,
          attributes: formatNewComment({
            newComment: request.body,
            full_name: user.full_name,
            username: user.username,
            case_workflow_id: request.params.id,
          }),
        });

        return response.ok({ body: newComment });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
