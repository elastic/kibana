/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import {
  CasesFindResponseRt,
  CasesFindRequestRt,
  throwErrors,
  caseStatuses,
} from '../../../../common';
import { transformCases, wrapError, escapeHatch } from '../utils';
import { RouteDeps } from '../types';
import { CASES_URL } from '../../../../common';
import { constructQueryOptions } from './helpers';

export function initFindCasesApi({ caseService, router, logger }: RouteDeps) {
  router.get(
    {
      path: `${CASES_URL}/_find`,
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
        const queryArgs = {
          tags: queryParams.tags,
          reporters: queryParams.reporters,
          sortByField: queryParams.sortField,
          status: queryParams.status,
          caseType: queryParams.type,
        };

        const caseQueries = constructQueryOptions(queryArgs);
        const cases = await caseService.findCasesGroupedByID({
          client,
          caseOptions: { ...queryParams, ...caseQueries.case },
          subCaseOptions: caseQueries.subCase,
        });

        const [openCases, inProgressCases, closedCases] = await Promise.all([
          ...caseStatuses.map((status) => {
            const statusQuery = constructQueryOptions({ ...queryArgs, status });
            return caseService.findCaseStatusStats({
              client,
              caseOptions: statusQuery.case,
              subCaseOptions: statusQuery.subCase,
            });
          }),
        ]);

        return response.ok({
          body: CasesFindResponseRt.encode(
            transformCases({
              casesMap: cases.casesMap,
              page: cases.page,
              perPage: cases.perPage,
              total: cases.total,
              countOpenCases: openCases,
              countInProgressCases: inProgressCases,
              countClosedCases: closedCases,
            })
          ),
        });
      } catch (error) {
        logger.error(`Failed to find cases in route: ${error}`);
        return response.customError(wrapError(error));
      }
    }
  );
}
