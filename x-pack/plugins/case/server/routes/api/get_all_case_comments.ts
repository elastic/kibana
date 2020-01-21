/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RouteDeps } from '.';
import { wrapError } from './utils';

export function initGetAllCaseCommentsApi({ caseService, router }: RouteDeps) {
  router.get(
    {
      path: '/api/cases/{id}/comments',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const theComments = await caseService.getAllCaseComments({
          client: context.core.savedObjects.client,
          caseId: request.params.id,
        });
        return response.ok({ body: theComments });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
