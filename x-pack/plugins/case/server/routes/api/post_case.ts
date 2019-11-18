/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteDeps } from '.';
import { NewCaseSchema } from './schema';
import { formatNewCase } from './utils';

const savedObjectType = 'case';

export function initPostCaseApi(deps: RouteDeps) {
  const { http, log, router, caseIndex } = deps;

  router.post(
    {
      path: '/api/cases/case',
      validate: {
        body: NewCaseSchema,
      },
    },
    async (context, request, response) => {
      log.debug(`Inside POST /api/cases/case`);

      const formattedCase = formatNewCase(request.body);

      const tags = request.route.options.tags;
      const tagPrefix = 'access:';
      const actionTags = tags.filter(tag => tag.startsWith(tagPrefix));
      console.log('actionTagsactionTags', actionTags);
      console.log('formattedCase', formattedCase);

      try {
        log.debug(`Attempting to create case`);
        return response.ok({ body: { id: request.params } });
      } catch (error) {
        log.debug(`Error creating case: ${error}`);
        return response.customError(error);
      }
    }
  );
}
