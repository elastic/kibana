/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RouteDeps } from '.';
import { wrapError } from './utils';
import { SavedOptionsFindOptionsSchema } from './schema';

export function initGetAllCasesApi({ caseService, router }: RouteDeps) {
  router.get(
    {
      path: '/api/cases',
      validate: {
        query: schema.nullable(SavedOptionsFindOptionsSchema),
      },
    },
    async (context, request, response) => {
      try {
        const args = request.query
          ? {
              client: context.core.savedObjects.client,
              options: request.query,
            }
          : {
              client: context.core.savedObjects.client,
            };
        const cases = await caseService.getAllCases(args);
        return response.ok({ body: cases });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
