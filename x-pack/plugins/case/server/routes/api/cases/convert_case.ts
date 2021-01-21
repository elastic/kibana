/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { wrapError, escapeHatch } from '../utils';

import { RouteDeps } from '../types';
import { CASE_COLLECTION_URL } from '../../../../common/constants';
import { CaseConvertRequest } from '../../../../common/api';

export function initConvertCaseToCollectionApi({ router }: RouteDeps) {
  router.post(
    {
      path: CASE_COLLECTION_URL,
      validate: {
        body: escapeHatch,
      },
    },
    async (context, request, response) => {
      try {
        if (!context.case) {
          return response.badRequest({ body: 'RouteHandlerContext is not registered for cases' });
        }

        const caseClient = context.case.getCaseClient();
        const body = request.body as CaseConvertRequest;
        return response.ok({
          body: await caseClient.convertCaseToCollection({ id: body.id, version: body.version }),
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
