/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { CaseService } from '../../case_service';
import { dateUpdatedCase, wrapError } from './utils';
import { RouteDeps } from '.';
import { UpdatedCaseSchema } from './schema';

export function initUpdateCaseApi(deps: RouteDeps) {
  const { log, router, caseIndex } = deps;

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
      const datedUpdatedCase = dateUpdatedCase(request.body);
      const requestClient = context.core.elasticsearch.dataClient;
      const service = new CaseService(requestClient.callAsCurrentUser, caseIndex, log);
      try {
        log.debug(`Attempting to POST to update case ${request.params.id}`);
        const newCase = await service.updateCase(datedUpdatedCase, request.params.id);
        return response.ok({ body: newCase });
      } catch (error) {
        log.debug(`Error on POST to update case ${request.params.id}: ${error}`);
        return response.customError(wrapError(error));
      }
    }
  );
}
