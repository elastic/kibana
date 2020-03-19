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

import { CommentPatchRequestRt, CommentResponseRt, throwErrors } from '../../../../../common/api';
import { CASE_SAVED_OBJECT } from '../../../../saved_object_types';
import { buildCommentUserActionItem } from '../../../../services/user_actions/helpers';
import { RouteDeps } from '../../types';
import { escapeHatch, wrapError, flattenCommentSavedObject } from '../../utils';

export function initPatchCommentApi({ caseService, router, userActionService }: RouteDeps) {
  router.patch(
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
          CommentPatchRequestRt.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const myComment = await caseService.getComment({
          client: context.core.savedObjects.client,
          commentId: query.id,
        });

        if (myComment == null) {
          throw Boom.notFound(`This comment ${query.id} does not exist anymore.`);
        }

        const caseRef = myComment.references.find(c => c.type === CASE_SAVED_OBJECT);
        if (caseRef == null || (caseRef != null && caseRef.id !== request.params.case_id)) {
          throw Boom.notFound(
            `This comment ${query.id} does not exist in ${request.params.case_id}).`
          );
        }

        if (query.version !== myComment.version) {
          throw Boom.conflict(
            'This case has been updated. Please refresh before saving additional updates.'
          );
        }

        const updatedBy = await caseService.getUser({ request, response });
        const updatedDate = new Date().toISOString();
        const { email, full_name, username } = updatedBy;
        const updatedComment = await caseService.patchComment({
          client: context.core.savedObjects.client,
          commentId: query.id,
          updatedAttributes: {
            comment: query.comment,
            updated_at: updatedDate,
            updated_by: { email, full_name, username },
          },
          version: query.version,
        });

        await userActionService.postUserActions({
          client,
          actions: [
            buildCommentUserActionItem({
              action: 'update',
              actionAt: updatedDate,
              actionBy: updatedBy,
              caseId: request.params.case_id,
              commentId: updatedComment.id,
              fields: ['comment'],
              newValue: query.comment,
              oldValue: myComment.attributes.comment,
            }),
          ],
        });

        return response.ok({
          body: CommentResponseRt.encode(
            flattenCommentSavedObject({
              ...updatedComment,
              attributes: { ...myComment.attributes, ...updatedComment.attributes },
              references: myComment.references,
            })
          ),
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
