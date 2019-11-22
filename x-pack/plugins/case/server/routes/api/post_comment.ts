/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { formatNewComment, wrapError } from './utils';
import { NewCommentSchema } from './schema';
import { RouteDeps } from '.';
import { CASE_SAVED_OBJECT, CASE_COMMENT_SAVED_OBJECT } from '../../constants';

export function initPostCommentApi({ authentication, log, router }: RouteDeps) {
  router.post(
    {
      path: '/api/cases/{id}/comment',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: NewCommentSchema,
      },
    },
    async (context, request, response) => {
      const user = await authentication!.getCurrentUser(request);
      if (!user) {
        log.debug(`Error on POST a new case: Bad User`);
        return response.customError(
          wrapError({ name: 'Bad User', message: 'The user is not authenticated' })
        );
      }
      const { full_name, username } = user;
      const client = context.core.savedObjects.client;
      const formattedComment = formatNewComment({
        newComment: request.body,
        full_name,
        username,
        case_workflow_id: request.params.id,
      });
      try {
        log.debug(`Attempting to POST a new comment on case ${request.params.id}`);
        const newComment = await client.create(CASE_COMMENT_SAVED_OBJECT, {
          case_workflow_id: request.params.id,
          ...formattedComment,
        });
        const theCase = await client.get(CASE_SAVED_OBJECT, request.params.id);
        const newCommentId = newComment.id;
        const allCaseComments = theCase.attributes!.comments.length
          ? [...theCase.attributes!.comments, newCommentId]
          : [newCommentId];
        const updatedCase = await client.update(CASE_SAVED_OBJECT, request.params.id, {
          comments: allCaseComments,
        });
        return response.ok({ body: { newComment, updatedCase } });
      } catch (error) {
        log.debug(`Error on POST a new comment on case ${request.params.id}: ${error}`);
        return response.customError(wrapError(error));
      }
    }
  );
}
