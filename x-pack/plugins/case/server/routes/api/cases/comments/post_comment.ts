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
import {
  escapeHatch,
  transformNewComment,
  wrapError,
  flattenCommentSavedObject,
} from '../../utils';
import { RouteDeps } from '../../types';

export function initPostCommentApi({ caseService, router }: RouteDeps) {
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
        const query = pipe(
          CommentRequestRt.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const myCase = await caseService.getCase({
          client: context.core.savedObjects.client,
          caseId: request.params.case_id,
        });

        const createdBy = await caseService.getUser({ request, response });
        const createdDate = new Date().toISOString();

        const newComment = await caseService.postNewComment({
          client: context.core.savedObjects.client,
          attributes: transformNewComment({
            createdDate,
            ...query,
            ...createdBy,
          }),
          references: [
            {
              type: CASE_SAVED_OBJECT,
              name: `associated-${CASE_SAVED_OBJECT}`,
              id: myCase.id,
            },
          ],
        });

        const updateCase = {
          comment_ids: [...myCase.attributes.comment_ids, newComment.id],
        };

        await caseService.patchCase({
          client: context.core.savedObjects.client,
          caseId: request.params.case_id,
          updatedAttributes: {
            ...updateCase,
          },
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
