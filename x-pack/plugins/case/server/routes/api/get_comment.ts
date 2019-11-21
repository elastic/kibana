/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RouteDeps } from '.';
import { wrapError } from './utils';

export function initGetCommentApi({ log, router }: RouteDeps) {
  router.get(
    {
      path: '/api/cases/comments/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        log.debug(`Attempting to GET comment ${request.params.id}`);
        const theComment = await context.core.savedObjects.client.get(
          'case-workflow-comment',
          request.params.id
        );
        return response.ok({ body: theComment });
      } catch (error) {
        log.debug(`Error on GET comment  ${request.params.id}: ${error}`);
        return response.customError(wrapError(error));
      }
    }
  );
}
