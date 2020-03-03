/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flattenCaseSavedObject, formatNewCase, wrapError } from './utils';
import { NewCaseSchema } from './schema';
import { RouteDeps } from '.';

export function initPostCaseApi({ caseService, router }: RouteDeps) {
  router.post(
    {
      path: '/api/cases',
      validate: {
        body: NewCaseSchema,
      },
    },
    async (context, request, response) => {
      let createdBy;
      try {
        createdBy = await caseService.getUser({ request, response });
      } catch (error) {
        return response.customError(wrapError(error));
      }

      try {
        const newCase = await caseService.postNewCase({
          client: context.core.savedObjects.client,
          attributes: formatNewCase(request.body, {
            ...createdBy,
          }),
        });
        return response.ok({ body: flattenCaseSavedObject(newCase, []) });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
