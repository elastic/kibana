/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

import { buildCommentUserActionItem } from '../../../../services/user_actions/helpers';
import { RouteDeps } from '../../types';
import { wrapError } from '../../utils';
import { CASE_COMMENTS_URL } from '../../../../../common/constants';

export function initDeleteAllCommentsApi({ caseService, router, userActionService }: RouteDeps) {
  router.delete(
    {
      path: CASE_COMMENTS_URL,
      validate: {
        params: schema.object({
          case_id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const client = context.core.savedObjects.client;
        const { username, full_name, email } = await caseService.getUser({ request, response });
        const deleteDate = new Date().toISOString();

        const comments = await caseService.getAllCaseComments({
          client,
          caseId: request.params.case_id,
        });
        await Promise.all(
          comments.saved_objects.map((comment) =>
            caseService.deleteComment({
              client,
              commentId: comment.id,
            })
          )
        );

        await userActionService.postUserActions({
          client,
          actions: comments.saved_objects.map((comment) =>
            buildCommentUserActionItem({
              action: 'delete',
              actionAt: deleteDate,
              actionBy: { username, full_name, email },
              caseId: request.params.case_id,
              commentId: comment.id,
              fields: ['comment'],
            })
          ),
        });

        return response.noContent();
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
