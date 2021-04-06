/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { CommentResponseRt } from '../../../../../common/api';
import { RouteDeps } from '../../types';
import { flattenCommentSavedObject, wrapError } from '../../utils';
import { CASE_COMMENT_DETAILS_URL, SAVED_OBJECT_TYPES } from '../../../../../common/constants';

export function initGetCommentApi({ attachmentService, router, logger }: RouteDeps) {
  router.get(
    {
      path: CASE_COMMENT_DETAILS_URL,
      validate: {
        params: schema.object({
          case_id: schema.string(),
          comment_id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const soClient = context.core.savedObjects.getClient({
          includedHiddenTypes: SAVED_OBJECT_TYPES,
        });

        const comment = await attachmentService.get({
          soClient,
          attachmentId: request.params.comment_id,
        });
        return response.ok({
          body: CommentResponseRt.encode(flattenCommentSavedObject(comment)),
        });
      } catch (error) {
        logger.error(
          `Failed to get comment in route case id: ${request.params.case_id} comment id: ${request.params.comment_id}: ${error}`
        );
        return response.customError(wrapError(error));
      }
    }
  );
}
