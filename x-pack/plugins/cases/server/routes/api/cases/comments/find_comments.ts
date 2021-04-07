/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

import { schema } from '@kbn/config-schema';
import Boom from '@hapi/boom';

import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import { SavedObjectFindOptionsRt, throwErrors } from '../../../../../common/api';
import { RouteDeps } from '../../types';
import { escapeHatch, wrapError } from '../../utils';
import { CASE_COMMENTS_URL, SAVED_OBJECT_TYPES } from '../../../../../common/constants';

const FindQueryParamsRt = rt.partial({
  ...SavedObjectFindOptionsRt.props,
  subCaseId: rt.string,
});

export function initFindCaseCommentsApi({ caseService, router, logger }: RouteDeps) {
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
        const soClient = context.core.savedObjects.getClient({
          includedHiddenTypes: SAVED_OBJECT_TYPES,
        });
        const query = pipe(
          FindQueryParamsRt.decode(request.query),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const client = await context.cases.getCasesClient();
        return response.ok({
          body: await client.attachments.find({
            soClient,
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
