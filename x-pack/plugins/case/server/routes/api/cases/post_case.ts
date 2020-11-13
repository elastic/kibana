/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { wrapError, escapeHatch } from '../utils';

import { RouteDeps } from '../types';
import { CASES_URL } from '../../../../common/constants';
import { CasePostRequest } from '../../../../common/api';

export function initPostCaseApi({ router }: RouteDeps) {
  router.post(
    {
      path: CASES_URL,
      validate: {
        body: escapeHatch,
      },
    },
    async (context, request, response) => {
      if (!context.case) {
        return response.badRequest({ body: 'RouteHandlerContext is not registered for cases' });
      }
      const caseClient = context.case.getCaseClient();
      const theCase = request.body as CasePostRequest;

      try {
        return response.ok({
          body: await caseClient.create({ theCase }),
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
