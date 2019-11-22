/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RouteDeps } from '.';
import { wrapError } from './utils';

export function initGetCaseApi({ caseService, router }: RouteDeps) {
  router.get(
    {
      path: '/api/cases/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const theCase = await caseService.getCase({
          client: context.core.savedObjects.client,
          caseId: request.params.id,
        });
        return response.ok({ body: theCase });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
