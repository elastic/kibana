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

import { flattenCaseSavedObject, wrapError, escapeHatch } from '../utils';

import { CasePushRequestRt, CaseResponseRt, throwErrors } from '../../../../common/api';
import { buildCaseUserActionItem } from '../../../services/user_actions/helpers';
import { RouteDeps } from '../types';

export function initPushedCaseUserActionApi({ caseService, router, userActionService }: RouteDeps) {
  router.post(
    {
      path: '/api/cases/{case_id}/_pushed',
      validate: {
        params: schema.object({
          case_id: schema.string(),
        }),
        query: escapeHatch,
      },
    },
    async (context, request, response) => {
      try {
        const client = context.core.savedObjects.client;
        const caseId = request.params.case_id;
        const query = pipe(
          CasePushRequestRt.decode(request.query),
          fold(throwErrors(Boom.badRequest), identity)
        );
        const pushedBy = await caseService.getUser({ request, response });
        const pushedDate = new Date().toISOString();

        const myCase = await caseService.getCase({
          client: context.core.savedObjects.client,
          caseId: request.params.case_id,
        });

        const totalCommentsFindByCases = await caseService.getAllCaseComments({
          client,
          caseId,
          options: {
            fields: [],
            page: 1,
            perPage: 1,
          },
        });

        const comments = await caseService.getAllCaseComments({
          client,
          caseId,
          options: {
            fields: [],
            page: 1,
            perPage: totalCommentsFindByCases.total,
          },
        });

        const pushed = {
          at: pushedDate,
          by: pushedBy,
          ...query,
        };

        const [updatedCase, updatedComments] = await Promise.all([
          caseService.patchCase({
            client,
            caseId,
            updatedAttributes: {
              pushed,
              updated_at: pushedDate,
              updated_by: pushedBy,
            },
            version: myCase.version,
          }),
          caseService.patchComments({
            client,
            comments: comments.saved_objects.map(comment => ({
              commentId: comment.id,
              updatedAttributes: {
                pushed_at: pushedDate,
                pushed_by: pushedBy,
                updated_at: pushedDate,
                updated_by: pushedBy,
              },
              version: comment.version,
            })),
          }),
        ]);

        await userActionService.postUserActions({
          client,
          actions: [
            buildCaseUserActionItem({
              action: 'push-to-service',
              actionAt: pushedDate,
              actionBy: pushedBy,
              caseId,
              fields: [],
              newValue: JSON.stringify(pushed),
            }),
          ],
        });

        return response.ok({
          body: CaseResponseRt.encode(
            flattenCaseSavedObject(
              {
                ...myCase,
                ...updatedCase,
                attributes: { ...myCase.attributes, ...updatedCase?.attributes },
                references: myCase.references,
              },
              comments.saved_objects.map(origComment => {
                const updatedComment = updatedComments.saved_objects.find(
                  c => c.id === origComment.id
                );
                return {
                  ...origComment,
                  ...updatedComment,
                  attributes: {
                    ...origComment.attributes,
                    ...updatedComment?.attributes,
                  },
                  version: updatedComment?.version ?? origComment.version,
                  references: origComment?.references ?? [],
                };
              })
            )
          ),
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
