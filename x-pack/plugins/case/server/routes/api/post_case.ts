/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { dateNewCase, wrapError } from './utils';
import { NewCaseSchema } from './schema';
import { RouteDeps } from '.';

export function initPostCaseApi({ caseIndex, log, router }: RouteDeps) {
  router.post(
    {
      path: '/api/cases',
      validate: {
        body: NewCaseSchema,
      },
    },
    async (context, request, response) => {
      const datedCase = dateNewCase(request.body);
      try {
        log.debug(`Attempting to POST a new case`);
        const newCase = await context.core.savedObjects.client.create('case-workflow', {
          ...datedCase,
        });
        return response.ok({ body: newCase });
      } catch (error) {
        log.debug(`Error on POST a new case: ${error}`);
        return response.customError(wrapError(error));
      }
    }
  );
}
