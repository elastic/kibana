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
import { CasesFindResponseRt, CasesFindRequestRt, throwErrors } from '../../../../common/api';
import { transformCases, sortToSnake, wrapError, escapeHatch } from '../utils';
import { RouteDeps } from '../types';
import { CASE_SAVED_OBJECT } from '../../../saved_object_types';

const getStatusFilter = (status: 'open' | 'closed', appendFilter?: string) =>
  `${CASE_SAVED_OBJECT}.attributes.status: ${status}${
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
        const client = context.core.savedObjects.client;
        const queryParams = pipe(
          CasesFindRequestRt.decode(request.query),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const { tags, status, ...query } = queryParams;
        const tagsFilter =
          tags != null && Array.isArray(tags) && tags.length > 0
            ? tags.map(tag => `${CASE_SAVED_OBJECT}.attributes.tags: ${tag}`)?.join(' OR ')
            : tags != null && tags.length > 0
            ? `${CASE_SAVED_OBJECT}.attributes.tags: ${tags}`
            : '';
        const filter = status != null ? getStatusFilter(status, tagsFilter) : tagsFilter;

        const args = queryParams
          ? {
              client,
              options: {
                ...query,
                filter,
                sortField: sortToSnake(query.sortField ?? ''),
              },
            }
          : {
              client,
            };

        const argsOpenCases = {
          client,
          options: {
            fields: [],
            page: 1,
            perPage: 1,
            filter: getStatusFilter('open', tagsFilter),
          },
        };

        const argsClosedCases = {
          client,
          options: {
            fields: [],
            page: 1,
            perPage: 1,
            filter: getStatusFilter('closed', tagsFilter),
          },
        };
        const [cases, openCases, closesCases] = await Promise.all([
          caseService.findCases(args),
          caseService.findCases(argsOpenCases),
          caseService.findCases(argsClosedCases),
        ]);
        return response.ok({
          body: CasesFindResponseRt.encode(
            transformCases(cases, openCases.total ?? 0, closesCases.total ?? 0)
          ),
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
