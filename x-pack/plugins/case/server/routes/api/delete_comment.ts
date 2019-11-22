/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RouteDeps } from '.';
import { wrapError } from './utils';
import { CASE_COMMENT_SAVED_OBJECT, CASE_SAVED_OBJECT } from '../../constants';

export function initDeleteCommentApi({ log, router }: RouteDeps) {
  router.delete(
    {
      path: '/api/cases/{case_id}/comments/{comment_id}',
      validate: {
        params: schema.object({
          case_id: schema.string(),
          comment_id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const client = context.core.savedObjects.client;
      try {
        log.debug(`Attempting to DELETE comment ${request.params.comment_id}`);
        const theComment = await context.core.savedObjects.client.delete(
          CASE_COMMENT_SAVED_OBJECT,
          request.params.comment_id
        );
        const theCase = await client.get(CASE_SAVED_OBJECT, request.params.comment_id);
        const allCaseComments = theCase.attributes!.comments;
        const newCaseComments = allCaseComments.filter(
          (comment: string) => comment !== request.params.comment_id
        );
        return response.ok({ body: theComment });
      } catch (error) {
        log.debug(`Error on DELETE comment  ${request.params.comment_id}: ${error}`);
        return response.customError(wrapError(error));
      }
    }
  );
}
