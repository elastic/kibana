/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import { isEmpty } from 'lodash';
import { CasesFindResponseRt, SavedObjectFindOptionsRt, throwErrors } from '../../../../common/api';
import { transformCases, sortToSnake, wrapError, escapeHatch } from '../utils';
import { RouteDeps } from '../types';
import { CASE_SAVED_OBJECT } from '../../../saved_object_types';

const getStatusFilter = (status: 'open' | 'closed', appendFilter?: string) =>
  `${CASE_SAVED_OBJECT}attributes.status: ${status}${
    !isEmpty(appendFilter) ? ` AND ${appendFilter}` : ''
  }`;

export function initFindCasesApi({ caseService, router }: RouteDeps) {
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

        const argsOpenCases = {
          ...args,
          options: {
            ...args.options,
            fields: [],
            page: 1,
            perPage: 1,
            filter: getStatusFilter('open', args?.options?.filter ?? ''),
          },
        };

        const argsClosedCases = {
          ...args,
          options: {
            ...args.options,
            fields: [],
            page: 1,
            perPage: 1,
            filter: getStatusFilter('closed', args?.options?.filter ?? ''),
          },
        };
        const [cases, openCases, closesCases] = await Promise.all([
          caseService.findCases(args),
          caseService.findCases(argsOpenCases),
          caseService.findCases(argsClosedCases),
        ]);
        return response.ok({
          body: CasesFindResponseRt.encode(
            transformCases(cases, openCases.total, closesCases.total)
          ),
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
