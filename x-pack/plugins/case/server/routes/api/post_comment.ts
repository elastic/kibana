/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { formatNewComment, wrapError } from './utils';
import { NewCommentSchema } from './schema';
import { RouteDeps } from '.';
import { CASE_SAVED_OBJECT } from '../../constants';

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
      } catch (error) {
        return response.customError(wrapError(error));
      }
      try {
        newComment = await caseService.postNewComment({
          client: context.core.savedObjects.client,
          attributes: formatNewComment({
            newComment: request.body,
            full_name: created_by.full_name,
            username: created_by.username,
          }),
          references: [
            {
              type: CASE_SAVED_OBJECT,
              name: `associated-${CASE_SAVED_OBJECT}`,
              id: request.params.id,
            },
          ],
        });

        return response.ok({ body: newComment });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
