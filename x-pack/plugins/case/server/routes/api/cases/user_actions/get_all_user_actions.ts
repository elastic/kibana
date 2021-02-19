/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDeps } from '../../types';
import { wrapError } from '../../utils';
import { CASE_USER_ACTIONS_URL, SUB_CASE_USER_ACTIONS_URL } from '../../../../../common/constants';

export function initGetAllCaseUserActionsApi({ router }: RouteDeps) {
  router.get(
    {
      path: CASE_USER_ACTIONS_URL,
      validate: {
        params: schema.object({
          case_id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      if (!context.case) {
        return response.badRequest({ body: 'RouteHandlerContext is not registered for cases' });
      }

      const caseClient = context.case.getCaseClient();
      const caseId = request.params.case_id;

      try {
        return response.ok({
          body: await caseClient.getUserActions({ caseId }),
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}

export function initGetAllSubCaseUserActionsApi({ router }: RouteDeps) {
  router.get(
    {
      path: SUB_CASE_USER_ACTIONS_URL,
      validate: {
        params: schema.object({
          case_id: schema.string(),
          sub_case_id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      if (!context.case) {
        return response.badRequest({ body: 'RouteHandlerContext is not registered for cases' });
      }

      const caseClient = context.case.getCaseClient();
      const caseId = request.params.case_id;
      const subCaseId = request.params.sub_case_id;

      try {
        return response.ok({
          body: await caseClient.getUserActions({ caseId, subCaseId }),
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
