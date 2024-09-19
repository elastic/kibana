/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDeps } from '../types';
import { wrapError } from '../utils';
import { SUB_CASE_DETAILS_URL } from '../../../../common';

export function initGetSubCaseApi({ router, logger }: RouteDeps) {
  router.get(
    {
      path: SUB_CASE_DETAILS_URL,
      validate: {
        params: schema.object({
          case_id: schema.string(),
          sub_case_id: schema.string(),
        }),
        query: schema.object({
          includeComments: schema.boolean({ defaultValue: true }),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const client = await context.cases.getCasesClient();

        return response.ok({
          body: await client.subCases.get({
            id: request.params.sub_case_id,
            includeComments: request.query.includeComments,
          }),
        });
      } catch (error) {
        logger.error(
          `Failed to get sub case in route case id: ${request.params.case_id} sub case id: ${request.params.sub_case_id} include comments: ${request.query?.includeComments}: ${error}`
        );
        return response.customError(wrapError(error));
      }
    }
  );
}
