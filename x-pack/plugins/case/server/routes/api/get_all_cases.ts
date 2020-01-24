/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteDeps } from '.';
import { wrapError } from './utils';

export function initGetAllCasesApi({ caseService, router }: RouteDeps) {
  router.get(
    {
      path: '/api/cases',
      validate: false,
    },
    async (context, request, response) => {
      try {
        const cases = await caseService.getAllCases({
          client: context.core.savedObjects.client,
        });
        return response.ok({ body: cases });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
