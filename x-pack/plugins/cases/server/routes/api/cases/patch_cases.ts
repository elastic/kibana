/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeHatch, wrapError } from '../utils';
import { RouteDeps } from '../types';
import { CasesPatchRequest } from '../../../../common/api';
import { CASES_URL } from '../../../../common/constants';

export function initPatchCasesApi({ router, logger }: RouteDeps) {
  router.patch(
    {
      path: CASES_URL,
      validate: {
        body: escapeHatch,
      },
    },
    async (context, request, response) => {
      try {
        if (!context.cases) {
          return response.badRequest({ body: 'RouteHandlerContext is not registered for cases' });
        }

        const casesClient = await context.cases.getCasesClient();
        const cases = request.body as CasesPatchRequest;

        return response.ok({
          body: await casesClient.cases.update(cases),
        });
      } catch (error) {
        logger.error(`Failed to patch cases in route: ${error}`);
        return response.customError(wrapError(error));
      }
    }
  );
}
