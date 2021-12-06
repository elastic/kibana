/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDeps } from '../types';
import { wrapError } from '../utils';
import { CASE_COMMENTS_URL } from '../../../../common/constants';

export function initGetAllCommentsApi({ router, logger }: RouteDeps) {
  router.get(
    {
      path: CASE_COMMENTS_URL,
      validate: {
        params: schema.object({
          case_id: schema.string(),
        }),
        query: schema.maybe(
          schema.object({
            includeSubCaseComments: schema.maybe(schema.boolean()),
            subCaseId: schema.maybe(schema.string()),
          })
        ),
      },
    },
    async (context, request, response) => {
      try {
        const client = await context.cases.getCasesClient();

        return response.ok({
          body: await client.attachments.getAll({
            caseID: request.params.case_id,
            includeSubCaseComments: request.query?.includeSubCaseComments,
            subCaseID: request.query?.subCaseId,
          }),
        });
      } catch (error) {
        logger.error(
          `Failed to get all comments in route case id: ${request.params.case_id} include sub case comments: ${request.query?.includeSubCaseComments} sub case id: ${request.query?.subCaseId}: ${error}`
        );
        return response.customError(wrapError(error));
      }
    }
  );
}
