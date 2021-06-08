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

import { FindQueryParamsRt, throwErrors, excess } from '../../../../common/api';
import { RouteDeps } from '../types';
import { escapeHatch, wrapError } from '../utils';
import { CASE_COMMENTS_URL } from '../../../../common/constants';

export function initFindCaseCommentsApi({ router, logger }: RouteDeps) {
  router.get(
    {
      path: `${CASE_COMMENTS_URL}/_find`,
      validate: {
        params: schema.object({
          case_id: schema.string(),
        }),
        query: escapeHatch,
      },
    },
    async (context, request, response) => {
      try {
        const query = pipe(
          excess(FindQueryParamsRt).decode(request.query),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const client = await context.cases.getCasesClient();
        return response.ok({
          body: await client.attachments.find({
            caseID: request.params.case_id,
            queryParams: query,
          }),
        });
      } catch (error) {
        logger.error(
          `Failed to find comments in route case id: ${request.params.case_id}: ${error}`
        );
        return response.customError(wrapError(error));
      }
    }
  );
}
