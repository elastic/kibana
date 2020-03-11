/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RouteDeps } from '../types';
import { wrapError } from '../utils';

export function initDeleteCasesApi({ caseService, router }: RouteDeps) {
  router.delete(
    {
      path: '/api/cases',
      validate: {
        query: schema.object({
          ids: schema.arrayOf(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        await Promise.all(
          request.query.ids.map(id =>
            caseService.deleteCase({
              client: context.core.savedObjects.client,
              caseId: id,
            })
          )
        );
        const comments = await Promise.all(
          request.query.ids.map(id =>
            caseService.getAllCaseComments({
              client: context.core.savedObjects.client,
              caseId: id,
            })
          )
        );

        if (comments.some(c => c.saved_objects.length > 0)) {
          await Promise.all(
            comments.map(c =>
              Promise.all(
                c.saved_objects.map(({ id }) =>
                  caseService.deleteComment({
                    client: context.core.savedObjects.client,
                    commentId: id,
                  })
                )
              )
            )
          );
        }
        return response.ok({ body: 'true' });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
