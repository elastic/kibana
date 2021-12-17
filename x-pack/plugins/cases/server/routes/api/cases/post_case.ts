/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { wrapError, escapeHatch } from '../utils';

import { RouteDeps } from '../types';
import { CasePostRequest } from '../../../../common/api';
import { CASES_URL } from '../../../../common/constants';

export function initPostCaseApi({ router, logger }: RouteDeps) {
  router.post(
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
        const theCase = request.body as CasePostRequest;

        return response.ok({
          body: await casesClient.cases.create({ ...theCase }),
        });
      } catch (error) {
        logger.error(`Failed to post case in route: ${error}`);
        return response.customError(wrapError(error));
      }
    }
  );
}
