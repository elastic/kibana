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

import { RouteDeps } from '../../types';
import { escapeHatch, wrapError, flattenCommentSavedObject } from '../../utils';

export function initPatchCommentApi({ caseService, router }: RouteDeps) {
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
        const query = pipe(
          CommentPatchRequestRt.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const myCase = await caseService.getCase({
          client: context.core.savedObjects.client,
          caseId: request.params.case_id,
        });

        if (!myCase.attributes.comment_ids.includes(query.id)) {
          throw Boom.notFound(
            `This comment ${query.id} does not exist in ${myCase.attributes.title} (id: ${request.params.case_id}).`
          );
        }

        const myComment = await caseService.getComment({
          client: context.core.savedObjects.client,
          commentId: query.id,
        });

        if (query.version !== myComment.version) {
          throw Boom.conflict(
            'This case has been updated. Please refresh before saving additional updates.'
          );
        }

        const updatedBy = await caseService.getUser({ request, response });
        const { full_name, username } = updatedBy;
        const updatedComment = await caseService.patchComment({
          client: context.core.savedObjects.client,
          commentId: query.id,
          updatedAttributes: {
            ...query,
            updated_at: new Date().toISOString(),
            updated_by: { full_name, username },
          },
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
