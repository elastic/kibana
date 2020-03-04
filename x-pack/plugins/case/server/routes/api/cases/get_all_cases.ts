/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import { CasesResponseRt, SavedObjectFindOptionsRt, throwErrors } from '../../../../common/api';
import { transformCases, sortToSnake, wrapError, escapeHatch } from '../utils';
import { RouteDeps } from '../types';

export function initGetAllCasesApi({ caseService, router }: RouteDeps) {
  router.get(
    {
      path: '/api/cases/_find',
      validate: {
        query: escapeHatch,
      },
    },
    async (context, request, response) => {
      try {
        const query = pipe(
          SavedObjectFindOptionsRt.decode(request.query),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const args = query
          ? {
              client: context.core.savedObjects.client,
              options: {
                ...query,
                sortField: sortToSnake(query.sortField ?? ''),
              },
            }
          : {
              client: context.core.savedObjects.client,
            };
        const cases = await caseService.getAllCases(args);
        return response.ok({
          body: CasesResponseRt.encode(transformCases(cases)),
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
