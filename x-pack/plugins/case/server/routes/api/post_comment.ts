/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { formatUpdatedComment, wrapError } from './utils';
import { NewCommentSchema } from './schema';
import { RouteDeps } from '.';

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
      const client = context.core.savedObjects.client;
      const updatedComment = formatUpdatedComment(request.body);
      try {
        log.debug(`Attempting to POST a new comment on case ${request.params.id}`);
        const newComment = await client.create('case-workflow-comment', {
          case_workflow_id: request.params.id,
          ...updatedComment,
        });
        const theCase = await client.get('case-workflow', request.params.id);
        const newCommentId = newComment.id;
        const allCaseComments = theCase.attributes!.comments.length
          ? [...theCase.attributes!.comments, newCommentId]
          : [newCommentId];
        const updatedCase = await client.update('case-workflow', request.params.id, {
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
