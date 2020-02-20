/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RouteDeps } from '.';
import { formatAllCases, wrapError } from './utils';
import { SavedObjectsFindOptionsSchema } from './schema';
import { AllCases } from './types';

export function initGetAllCasesApi({ caseService, router }: RouteDeps) {
  router.get(
    {
      path: '/api/cases',
      validate: {
        query: schema.nullable(SavedObjectsFindOptionsSchema),
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
        const body: AllCases = formatAllCases(cases);
        return response.ok({
          body,
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
