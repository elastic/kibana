/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { formatNewCase, wrapError } from './utils';
import { NewCaseSchema } from './schema';
import { RouteDeps } from '.';
import { CASE_SAVED_OBJECT } from '../../constants';

export function initPostCaseApi({ authentication, log, router }: RouteDeps) {
  router.post(
    {
      path: '/api/cases',
      validate: {
        body: NewCaseSchema,
      },
    },
    async (context, request, response) => {
      const user = await authentication!.getCurrentUser(request);
      if (!user) {
        log.debug(`Error on POST a new case: Bad User`);
        return response.customError(
          wrapError({ name: 'Bad User', message: 'The user is not authenticated' })
        );
      }
      const { full_name, username } = user;
      const formattedCase = formatNewCase(request.body, { full_name, username });

      try {
        log.debug(`Attempting to POST a new case`);
        const newCase = await context.core.savedObjects.client.create(CASE_SAVED_OBJECT, {
          ...formattedCase,
        });
        return response.ok({ body: newCase });
      } catch (error) {
        log.debug(`Error on POST a new case: ${error}`);
        return response.customError(wrapError(error));
      }
    }
  );
}
