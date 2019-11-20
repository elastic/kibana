/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CaseService } from '../../case_service';
import { RouteDeps } from '.';
import { wrapError } from './utils';

export function initGetAllApi({ caseIndex, log, router }: RouteDeps) {
  router.get(
    {
      path: '/api/cases',
      validate: false,
    },
    async (context, request, response) => {
      const requestClient = context.core.elasticsearch.dataClient;
      const service = new CaseService(requestClient.callAsCurrentUser, caseIndex, log);
      try {
        log.debug(`Attempting to GET all cases`);
        const cases = await service.getAllCases();
        return response.ok({ body: cases });
      } catch (error) {
        log.debug(`Error on GET all cases: ${error}`);
        return response.customError(wrapError(error));
      }
    }
  );
}
