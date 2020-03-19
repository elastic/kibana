/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import Boom from 'boom';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import { CommentRequestRt, CommentResponseRt, throwErrors } from '../../../../../common/api';
import { CASE_SAVED_OBJECT } from '../../../../saved_object_types';
import { buildCommentUserActionItem } from '../../../../services/user_actions/helpers';
import {
  escapeHatch,
  transformNewComment,
  wrapError,
  flattenCommentSavedObject,
} from '../../utils';
import { RouteDeps } from '../../types';

export function initPostCommentApi({ caseService, router, userActionService }: RouteDeps) {
  router.post(
    {
      path: '/api/cases/{case_id}/comments',
      validate: {
        params: schema.object({
          case_id: schema.string(),
        }),
        body: escapeHatch,
      },
    },
    async (context, request, response) => {
      try {
        const client = context.core.savedObjects.client;
        const query = pipe(
          CommentRequestRt.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const createdBy = await caseService.getUser({ request, response });
        const createdDate = new Date().toISOString();

        const newComment = await caseService.postNewComment({
          client,
          attributes: transformNewComment({
            createdDate,
            ...query,
            ...createdBy,
          }),
          references: [
            {
              type: CASE_SAVED_OBJECT,
              name: `associated-${CASE_SAVED_OBJECT}`,
              id: request.params.case_id,
            },
          ],
        });

        await userActionService.postUserActions({
          client,
          actions: [
            buildCommentUserActionItem({
              action: 'create',
              actionAt: createdDate,
              actionBy: createdBy,
              caseId: request.params.case_id,
              commentId: newComment.id,
              fields: ['comment'],
              newValue: query.comment,
            }),
          ],
        });

        return response.ok({
          body: CommentResponseRt.encode(flattenCommentSavedObject(newComment)),
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
