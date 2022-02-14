/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDeps } from '../types';
import { getWarningHeader, logDeprecatedEndpoint, wrapError } from '../utils';
import { CASE_USER_ACTIONS_URL } from '../../../../common/constants';

/**
 * @deprecated since version 8.1.0
 */
export function initGetAllCaseUserActionsApi({ router, logger, kibanaVersion }: RouteDeps) {
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

        logDeprecatedEndpoint(
          logger,
          request.headers,
          `The get all cases user actions API '${CASE_USER_ACTIONS_URL}' is deprecated.`
        );

        const casesClient = await context.cases.getCasesClient();
        const caseId = request.params.case_id;

        return response.ok({
          headers: {
            ...getWarningHeader(kibanaVersion),
          },
          body: await casesClient.userActions.getAll({ caseId }),
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
