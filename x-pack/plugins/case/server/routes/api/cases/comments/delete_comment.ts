/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { schema } from '@kbn/config-schema';

import { CASE_SAVED_OBJECT } from '../../../../saved_object_types';
import { buildCommentUserActionItem } from '../../../../services/user_actions/helpers';
import { RouteDeps } from '../../types';
import { wrapError } from '../../utils';
import { CASE_COMMENT_DETAILS_URL } from '../../../../../common/constants';

export function initDeleteCommentApi({ caseService, router, userActionService }: RouteDeps) {
  router.delete(
    {
      path: CASE_COMMENT_DETAILS_URL,
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
        const { username, full_name, email } = await caseService.getUser({ request, response });
        const deleteDate = new Date().toISOString();

        const myComment = await caseService.getComment({
          client,
          commentId: request.params.comment_id,
        });

        if (myComment == null) {
          throw Boom.notFound(`This comment ${request.params.comment_id} does not exist anymore.`);
        }

        const caseRef = myComment.references.find((c) => c.type === CASE_SAVED_OBJECT);
        if (caseRef == null || (caseRef != null && caseRef.id !== request.params.case_id)) {
          throw Boom.notFound(
            `This comment ${request.params.comment_id} does not exist in ${request.params.case_id}).`
          );
        }

        await caseService.deleteComment({
          client,
          commentId: request.params.comment_id,
        });

        await userActionService.postUserActions({
          client,
          actions: [
            buildCommentUserActionItem({
              action: 'delete',
              actionAt: deleteDate,
              actionBy: { username, full_name, email },
              caseId: request.params.case_id,
              commentId: request.params.comment_id,
              fields: ['comment'],
            }),
          ],
        });

        return response.noContent();
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
