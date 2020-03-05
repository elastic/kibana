/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { SavedObject } from 'kibana/server';
import Boom from 'boom';
import { wrapError } from './utils';
import { UpdateCommentArguments } from './schema';
import { RouteDeps } from '.';
import { CommentAttributes } from './types';

export function initUpdateCommentApi({ caseService, router }: RouteDeps) {
  router.patch(
    {
      path: '/api/cases/comment/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: UpdateCommentArguments,
      },
    },
    async (context, request, response) => {
      let theComment: SavedObject<CommentAttributes>;
      try {
        theComment = await caseService.getComment({
          client: context.core.savedObjects.client,
          commentId: request.params.id,
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
      if (request.body.version !== theComment.version) {
        return response.customError(
          wrapError(
            Boom.conflict(
              'This comment has been updated. Please refresh before saving additional updates.'
            )
          )
        );
      }
      if (request.body.comment === theComment.attributes.comment) {
        return response.customError(
          wrapError(Boom.notAcceptable('Comment is identical to current version.'))
        );
      }
      try {
        const updatedComment = await caseService.updateComment({
          client: context.core.savedObjects.client,
          commentId: request.params.id,
          updatedAttributes: {
            comment: request.body.comment,
            updated_at: new Date().toISOString(),
          },
        });
        return response.ok({
          body: { ...updatedComment.attributes, version: updatedComment.version },
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
