/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { formatUpdatedComment, wrapError } from './utils';
import { NewCommentSchema } from './schema';
import { RouteDeps } from '.';
import { CASE_COMMENT_SAVED_OBJECT } from '../../constants';

export function initUpdateCommentApi({ log, router }: RouteDeps) {
  router.post(
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
      const client = context.core.savedObjects.client;
      const savedObjectComment = formatUpdatedComment(request.body);
      try {
        log.debug(`Attempting to POST a comment update on comment ${request.params.id}`);
        const updatedComment = await client.update(
          CASE_COMMENT_SAVED_OBJECT,
          request.params.id,
          savedObjectComment
        );
        return response.ok({ body: updatedComment });
      } catch (error) {
        log.debug(`Error on POST a comment update on comment ${request.params.id}: ${error}`);
        return response.customError(wrapError(error));
      }
    }
  );
}
