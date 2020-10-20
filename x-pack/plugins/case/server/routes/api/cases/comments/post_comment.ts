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

import { CaseResponseRt, CommentRequestRt, excess, throwErrors } from '../../../../../common/api';
import { CASE_SAVED_OBJECT } from '../../../../saved_object_types';
import { buildCommentUserActionItem } from '../../../../services/user_actions/helpers';
import { escapeHatch, transformNewComment, wrapError, flattenCaseSavedObject } from '../../utils';
import { RouteDeps } from '../../types';
import { CASE_COMMENTS_URL } from '../../../../../common/constants';

export function initPostCommentApi({
  caseConfigureService,
  caseService,
  router,
  userActionService,
}: RouteDeps) {
  router.post(
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
          excess(CommentRequestRt).decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const myCase = await caseService.getCase({
          client,
          caseId,
        });

        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { username, full_name, email } = await caseService.getUser({ request, response });
        const createdDate = new Date().toISOString();

        const [newComment, updatedCase] = await Promise.all([
          caseService.postNewComment({
            client,
            attributes: transformNewComment({
              createdDate,
              ...query,
              username,
              full_name,
              email,
            }),
            references: [
              {
                type: CASE_SAVED_OBJECT,
                name: `associated-${CASE_SAVED_OBJECT}`,
                id: myCase.id,
              },
            ],
          }),
          caseService.patchCase({
            client,
            caseId,
            updatedAttributes: {
              updated_at: createdDate,
              updated_by: { username, full_name, email },
            },
            version: myCase.version,
          }),
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

        const [comments] = await Promise.all([
          caseService.getAllCaseComments({
            client,
            caseId,
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
                action: 'create',
                actionAt: createdDate,
                actionBy: { username, full_name, email },
                caseId: myCase.id,
                commentId: newComment.id,
                fields: ['comment'],
                newValue: query.comment,
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
            })
          ),
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
