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

import { CommentPatchRequestRt, CaseResponseRt, throwErrors } from '../../../../../common/api';
import { CASE_SAVED_OBJECT } from '../../../../saved_object_types';
import { buildCommentUserActionItem } from '../../../../services/user_actions/helpers';
import { RouteDeps } from '../../types';
import { escapeHatch, wrapError, flattenCaseSavedObject } from '../../utils';
import { CASE_COMMENTS_URL } from '../../../../../common/constants';
import { getConnectorId } from '../helpers';

export function initPatchCommentApi({
  caseConfigureService,
  caseService,
  router,
  userActionService,
}: RouteDeps) {
  router.patch(
    {
      path: CASE_COMMENTS_URL,
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
        const caseId = request.params.case_id;
        const query = pipe(
          CommentPatchRequestRt.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const myCase = await caseService.getCase({
          client,
          caseId,
        });

        const myComment = await caseService.getComment({
          client,
          commentId: query.id,
        });

        if (myComment == null) {
          throw Boom.notFound(`This comment ${query.id} does not exist anymore.`);
        }

        const caseRef = myComment.references.find((c) => c.type === CASE_SAVED_OBJECT);
        if (caseRef == null || (caseRef != null && caseRef.id !== caseId)) {
          throw Boom.notFound(`This comment ${query.id} does not exist in ${caseId}).`);
        }

        if (query.version !== myComment.version) {
          throw Boom.conflict(
            'This case has been updated. Please refresh before saving additional updates.'
          );
        }

        const { username, full_name, email } = await caseService.getUser({ request, response });
        const updatedDate = new Date().toISOString();
        const [updatedComment, updatedCase, myCaseConfigure] = await Promise.all([
          caseService.patchComment({
            client,
            commentId: query.id,
            updatedAttributes: {
              comment: query.comment,
              updated_at: updatedDate,
              updated_by: { email, full_name, username },
            },
            version: query.version,
          }),
          caseService.patchCase({
            client,
            caseId,
            updatedAttributes: {
              updated_at: updatedDate,
              updated_by: { username, full_name, email },
            },
            version: myCase.version,
          }),
          caseConfigureService.find({ client }),
        ]);

        const totalCommentsFindByCases = await caseService.getAllCaseComments({
          client,
          caseId,
          options: {
            fields: [],
            page: 1,
            perPage: 1,
          },
        });
        const caseConfigureConnectorId = getConnectorId(myCaseConfigure);
        const [comments] = await Promise.all([
          caseService.getAllCaseComments({
            client,
            caseId: request.params.case_id,
            options: {
              fields: [],
              page: 1,
              perPage: totalCommentsFindByCases.total,
            },
          }),
          userActionService.postUserActions({
            client,
            actions: [
              buildCommentUserActionItem({
                action: 'update',
                actionAt: updatedDate,
                actionBy: { username, full_name, email },
                caseId: request.params.case_id,
                commentId: updatedComment.id,
                fields: ['comment'],
                newValue: query.comment,
                oldValue: myComment.attributes.comment,
              }),
            ],
          }),
        ]);

        return response.ok({
          body: CaseResponseRt.encode(
            flattenCaseSavedObject({
              savedObject: {
                ...myCase,
                ...updatedCase,
                attributes: { ...myCase.attributes, ...updatedCase.attributes },
                version: updatedCase.version ?? myCase.version,
                references: myCase.references,
              },
              comments: comments.saved_objects,
              caseConfigureConnectorId,
            })
          ),
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
