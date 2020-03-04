/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RouteDeps } from '../../types';
import { wrapError } from '../../utils';

export function initDeleteCommentApi({ caseService, router }: RouteDeps) {
  router.delete(
    {
      path: '/api/cases/{case_id}/comments',
      validate: {
        params: schema.object({
          case_id: schema.string(),
        }),
        query: schema.object({
          ids: schema.maybe(schema.arrayOf(schema.string())),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const client = context.core.savedObjects.client;
        const myCase = await caseService.getCase({
          client: context.core.savedObjects.client,
          caseId: request.params.case_id,
        });
        const updateCase = {
          comment_ids: myCase.attributes.comment_ids,
        };
        const ids = request.query.ids;
        if (ids != null && ids.length > 0) {
          await Promise.all(
            ids.map(id => {
              updateCase.comment_ids = updateCase.comment_ids.filter(cId => cId !== id);
              return caseService.deleteComment({
                client,
                commentId: id,
              });
            })
          );
        } else {
          const comments = await caseService.getAllCaseComments({
            client: context.core.savedObjects.client,
            caseId: request.params.case_id,
          });
          updateCase.comment_ids = [];
          await Promise.all(
            comments.saved_objects.map(comment =>
              caseService.deleteComment({
                client,
                commentId: comment.id,
              })
            )
          );
        }

        await caseService.patchCase({
          client: context.core.savedObjects.client,
          caseId: request.params.case_id,
          updatedAttributes: {
            ...updateCase,
            updated_at: myCase.attributes.updated_at,
            updated_by: myCase.attributes.updated_by,
          },
        });

        return response.ok({ body: 'true' });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
