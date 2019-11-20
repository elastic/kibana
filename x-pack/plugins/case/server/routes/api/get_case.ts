/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { CaseService } from '../../case_service';
import { RouteDeps } from '.';
import { wrapError } from './utils';

export function initGetCaseApi({ caseIndex, log, router }: RouteDeps) {
  router.get(
    {
      path: '/api/cases/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const requestClient = context.core.elasticsearch.dataClient;
      const service = new CaseService(requestClient.callAsCurrentUser, caseIndex, log);
      try {
        log.debug(`Attempting to GET case ${request.params.id}`);
        const theCase = await service.getCase(request.params.id);
        return response.ok({ body: theCase });
      } catch (error) {
        log.debug(`Error on GET case  ${request.params.id}: ${error}`);
        return response.customError(wrapError(error));
      }
    }
  );
}
