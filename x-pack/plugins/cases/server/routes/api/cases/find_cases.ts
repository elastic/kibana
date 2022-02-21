/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesFindRequest } from '../../../../common/api';
import { CASES_URL } from '../../../../common/constants';
import { wrapError, escapeHatch } from '../utils';
import { RouteDeps } from '../types';

export function initFindCasesApi({ router, logger }: RouteDeps) {
  router.get(
    {
      path: `${CASES_URL}/_find`,
      validate: {
        query: escapeHatch,
      },
    },
    async (context, request, response) => {
      try {
        if (!context.cases) {
          return response.badRequest({ body: 'RouteHandlerContext is not registered for cases' });
        }
        const casesClient = await context.cases.getCasesClient();
        const options = request.query as CasesFindRequest;

        return response.ok({
          body: await casesClient.cases.find({ ...options }),
        });
      } catch (error) {
        logger.error(`Failed to find cases in route: ${error}`);
        return response.customError(wrapError(error));
      }
    }
  );
}
