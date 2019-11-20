/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteDeps } from '.';
import { wrapError } from './utils';

export function initGetAllApi({ caseIndex, log, router }: RouteDeps) {
  router.get(
    {
      path: '/api/cases',
      validate: false,
    },
    async (context, request, response) => {
      try {
        log.debug(`Attempting to GET all cases`);
        const cases = await context.core.savedObjects.client.find({ type: 'case-workflow' });
        return response.ok({ body: cases });
      } catch (error) {
        log.debug(`Error on GET all cases: ${error}`);
        return response.customError(wrapError(error));
      }
    }
  );
}
