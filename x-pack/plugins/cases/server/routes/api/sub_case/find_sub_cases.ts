/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import Boom from '@hapi/boom';

import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import { SubCasesFindRequestRt, SUB_CASES_URL, throwErrors } from '../../../../common';
import { RouteDeps } from '../types';
import { escapeHatch, wrapError } from '../utils';

export function initFindSubCasesApi({ router, logger }: RouteDeps) {
  router.get(
    {
      path: `${SUB_CASES_URL}/_find`,
      validate: {
        params: schema.object({
          case_id: schema.string(),
        }),
        query: escapeHatch,
      },
    },
    async (context, request, response) => {
      try {
        const queryParams = pipe(
          SubCasesFindRequestRt.decode(request.query),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const client = await context.cases.getCasesClient();
        return response.ok({
          body: await client.subCases.find({
            caseID: request.params.case_id,
            queryParams,
          }),
        });
      } catch (error) {
        logger.error(
          `Failed to find sub cases in route case id: ${request.params.case_id}: ${error}`
        );
        return response.customError(wrapError(error));
      }
    }
  );
}
