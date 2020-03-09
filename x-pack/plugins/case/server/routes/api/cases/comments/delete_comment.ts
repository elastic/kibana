/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { schema } from '@kbn/config-schema';
import { RouteDeps } from '../../types';
import { wrapError } from '../../utils';

export function initDeleteCommentApi({ caseService, router }: RouteDeps) {
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
      try {
        const client = context.core.savedObjects.client;
        const myCase = await caseService.getCase({
          client: context.core.savedObjects.client,
          caseId: request.params.case_id,
        });

        if (!myCase.attributes.comment_ids.includes(request.params.comment_id)) {
          throw Boom.notFound(
            `This comment ${request.params.comment_id} does not exist in ${myCase.attributes.title} (id: ${request.params.case_id}).`
          );
        }

        await caseService.deleteComment({
          client,
          commentId: request.params.comment_id,
        });

        const updateCase = {
          comment_ids: myCase.attributes.comment_ids.filter(
            cId => cId !== request.params.comment_id
          ),
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
