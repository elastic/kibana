/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDeps } from '../types';
import { wrapError, getWarningHeader, logDeprecatedEndpoint } from '../utils';
import { CASE_COMMENTS_URL } from '../../../../common/constants';

/**
 * @deprecated since version 8.1.0
 */
export function initGetAllCommentsApi({ router, logger, kibanaVersion }: RouteDeps) {
  router.get(
    {
      path: CASE_COMMENTS_URL,
      validate: {
        params: schema.object({
          case_id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        logDeprecatedEndpoint(
          logger,
          request.headers,
          `The get all cases comments API '${CASE_COMMENTS_URL}' is deprecated.`
        );

        const client = await context.cases.getCasesClient();

        return response.ok({
          headers: {
            ...getWarningHeader(kibanaVersion),
          },
          body: await client.attachments.getAll({
            caseID: request.params.case_id,
          }),
        });
      } catch (error) {
        logger.error(
          `Failed to get all comments in route case id: ${request.params.case_id}: ${error}`
        );
        return response.customError(wrapError(error));
      }
    }
  );
}
