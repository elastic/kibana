/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RouteDeps } from '.';
import { wrapError } from './utils';

export function initDeleteCaseApi({ caseService, router }: RouteDeps) {
  router.delete(
    {
      path: '/api/cases/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      let theCase;
      try {
        theCase = await caseService.getCase({
          client: context.core.savedObjects.client,
          caseId: request.params.id,
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
      try {
        const comments = theCase.attributes.comments;
        await Promise.all(
          comments.map((commentId: string) =>
            caseService.deleteComment({
              client: context.core.savedObjects.client,
              commentId,
            })
          )
        );
      } catch (error) {
        return response.customError(wrapError(error));
      }
      try {
        await caseService.deleteCase({
          client: context.core.savedObjects.client,
          caseId: request.params.id,
        });
        return response.ok({ body: { deletedCase: true } });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
