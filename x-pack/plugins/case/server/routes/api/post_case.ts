/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteDeps } from '.';
import { NewCaseSchema } from './schema';
import { formatNewCase, wrapError } from './utils';
import { CaseService } from '../../case_service';

export function initPostCaseApi(deps: RouteDeps) {
  const { log, router, caseIndex } = deps;

  router.post(
    {
      path: '/api/cases/case',
      validate: {
        body: NewCaseSchema,
      },
    },
    async (context, request, response) => {
      const formattedCase = formatNewCase(request.body);
      const requestClient = context.core.elasticsearch.dataClient;
      const service = new CaseService(requestClient.callAsCurrentUser, caseIndex, log);
      try {
        log.debug(`Attempting to POST a new case`);
        const newCase = await service.postCase(formattedCase);
        return response.ok({ body: newCase });
      } catch (error) {
        log.debug(`Error on POST a new case: ${error}`);
        return response.customError(wrapError(error));
      }
    }
  );
}
