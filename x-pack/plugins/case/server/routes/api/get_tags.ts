/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteDeps } from './index';
import { wrapError } from './utils';

export function initGetTagsApi({ caseService, router }: RouteDeps) {
  router.get(
    {
      path: '/api/cases/tags',
      validate: {},
    },
    async (context, request, response) => {
      let theCase;
      try {
        theCase = await caseService.getTags({
          client: context.core.savedObjects.client,
        });
        return response.ok({ body: theCase });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
