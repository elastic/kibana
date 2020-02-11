/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { wrapError } from './utils';
import { RouteDeps } from '.';
import { UpdatedCaseSchema } from './schema';

export function initUpdateCaseApi({ caseService, router }: RouteDeps) {
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
      try {
        const updatedCase = await caseService.updateCase({
          client: context.core.savedObjects.client,
          caseId: request.params.id,
          updatedAttributes: request.body,
        });
        return response.ok({ body: updatedCase });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
