/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDeps } from '../../types';
import { wrapError } from '../../utils';
import { CASE_USER_ACTIONS_URL, SUB_CASE_USER_ACTIONS_URL } from '../../../../../common';

export function initGetAllCaseUserActionsApi({ router, logger }: RouteDeps) {
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
      try {
        if (!context.cases) {
          return response.badRequest({ body: 'RouteHandlerContext is not registered for cases' });
        }

        const casesClient = context.cases.getCasesClient();
        const caseId = request.params.case_id;

        return response.ok({
          body: await casesClient.getUserActions({ caseId }),
        });
      } catch (error) {
        logger.error(
          `Failed to retrieve case user actions in route case id: ${request.params.case_id}: ${error}`
        );
        return response.customError(wrapError(error));
      }
    }
  );
}

export function initGetAllSubCaseUserActionsApi({ router, logger }: RouteDeps) {
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
      try {
        if (!context.cases) {
          return response.badRequest({ body: 'RouteHandlerContext is not registered for cases' });
        }

        const casesClient = context.cases.getCasesClient();
        const caseId = request.params.case_id;
        const subCaseId = request.params.sub_case_id;

        return response.ok({
          body: await casesClient.getUserActions({ caseId, subCaseId }),
        });
      } catch (error) {
        logger.error(
          `Failed to retrieve sub case user actions in route case id: ${request.params.case_id} sub case id: ${request.params.sub_case_id}: ${error}`
        );
        return response.customError(wrapError(error));
      }
    }
  );
}
