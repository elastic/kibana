/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import Boom from '@hapi/boom';
import { RouteDeps } from '../types';
import { wrapError } from '../utils';
import { CASE_DETAILS_URL, ENABLE_CASE_CONNECTOR } from '../../../../common';

export function initGetCaseApi({ router, logger }: RouteDeps) {
  router.get(
    {
      path: CASE_DETAILS_URL,
      validate: {
        params: schema.object({
          case_id: schema.string(),
        }),
        query: schema.object({
          includeComments: schema.boolean({ defaultValue: true }),
          includeSubCaseComments: schema.maybe(schema.boolean({ defaultValue: false })),
        }),
      },
    },
    async (context, request, response) => {
      try {
        if (!ENABLE_CASE_CONNECTOR && request.query.includeSubCaseComments !== undefined) {
          throw Boom.badRequest(
            'The `subCaseId` is not supported when the case connector feature is disabled'
          );
        }
        const casesClient = context.cases.getCasesClient();
        const id = request.params.case_id;

        return response.ok({
          body: await casesClient.get({
            id,
            includeComments: request.query.includeComments,
            includeSubCaseComments: request.query.includeSubCaseComments,
          }),
        });
      } catch (error) {
        logger.error(
          `Failed to retrieve case in route case id: ${request.params.case_id} \ninclude comments: ${request.query.includeComments} \ninclude sub comments: ${request.query.includeSubCaseComments}: ${error}`
        );
        return response.customError(wrapError(error));
      }
    }
  );
}
