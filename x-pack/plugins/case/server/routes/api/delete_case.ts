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
      let allCaseComments;
      try {
        await caseService.deleteCase({
          client: context.core.savedObjects.client,
          caseId: request.params.id,
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
      try {
        allCaseComments = await caseService.getAllCaseComments({
          client: context.core.savedObjects.client,
          caseId: request.params.id,
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
      try {
        if (allCaseComments.saved_objects.length > 0) {
          await Promise.all(
            allCaseComments.saved_objects.map(({ id }) =>
              caseService.deleteComment({
                client: context.core.savedObjects.client,
                commentId: id,
              })
            )
          );
        }
        return response.noContent();
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
