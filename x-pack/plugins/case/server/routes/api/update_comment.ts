/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { wrapError } from './utils';
import { NewCommentSchema } from './schema';
import { RouteDeps } from '.';

export function initUpdateCommentApi({ caseService, router }: RouteDeps) {
  router.patch(
    {
      path: '/api/cases/comment/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: NewCommentSchema,
      },
    },
    async (context, request, response) => {
      try {
        const updatedComment = await caseService.updateComment({
          client: context.core.savedObjects.client,
          commentId: request.params.id,
          updatedAttributes: {
            ...request.body,
            updated_at: new Date().toISOString(),
          },
        });
        return response.ok({ body: updatedComment.attributes });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
