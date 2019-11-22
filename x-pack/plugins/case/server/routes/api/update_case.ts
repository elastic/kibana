/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { formatUpdatedCase, wrapError } from './utils';
import { RouteDeps } from '.';
import { UpdatedCaseSchema } from './schema';
import { CASE_SAVED_OBJECT } from '../../constants';

export function initUpdateCaseApi({ log, router, caseIndex }: RouteDeps) {
  router.post(
    {
      path: '/api/cases/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: UpdatedCaseSchema,
      },
    },
    async (context, request, response) => {
      const formattedUpdatedCase = formatUpdatedCase(request.body);
      try {
        log.debug(`Attempting to POST to update case ${request.params.id}`);
        const updatedCase = await context.core.savedObjects.client.update(
          CASE_SAVED_OBJECT,
          request.params.id,
          {
            ...formattedUpdatedCase,
          }
        );
        return response.ok({ body: updatedCase });
      } catch (error) {
        log.debug(`Error on POST to update case ${request.params.id}: ${error}`);
        return response.customError(wrapError(error));
      }
    }
  );
}
