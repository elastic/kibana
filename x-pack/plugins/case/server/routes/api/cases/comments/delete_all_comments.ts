/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RouteDeps } from '../../types';
import { wrapError } from '../../utils';

export function initDeleteAllCommentsApi({ caseService, router }: RouteDeps) {
  router.delete(
    {
      path: '/api/cases/{case_id}/comments',
      validate: {
        params: schema.object({
          case_id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const client = context.core.savedObjects.client;

        const comments = await caseService.getAllCaseComments({
          client: context.core.savedObjects.client,
          caseId: request.params.case_id,
        });
        await Promise.all(
          comments.saved_objects.map(comment =>
            caseService.deleteComment({
              client,
              commentId: comment.id,
            })
          )
        );

        const updateCase = {
          comment_ids: [],
        };
        await caseService.patchCase({
          client: context.core.savedObjects.client,
          caseId: request.params.case_id,
          updatedAttributes: {
            ...updateCase,
          },
        });

        return response.ok({ body: 'true' });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
