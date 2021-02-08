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

import {
  caseStatuses,
  SubCasesFindRequestRt,
  SubCasesFindResponseRt,
  throwErrors,
} from '../../../../../common/api';
import { RouteDeps } from '../../types';
import { escapeHatch, transformSubCases, wrapError } from '../../utils';
import { SUB_CASES_URL } from '../../../../../common/constants';
import { constructQueryOptions } from '../helpers';
import { defaultPage, defaultPerPage } from '../..';

export function initFindSubCasesApi({ caseService, router }: RouteDeps) {
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
        const client = context.core.savedObjects.client;
        const queryParams = pipe(
          SubCasesFindRequestRt.decode(request.query),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const ids = [request.params.case_id];
        const subCases = await caseService.findSubCasesGroupByCase({
          client,
          ids,
          options: {
            sortField: 'created_at',
            page: defaultPage,
            perPage: defaultPerPage,
            ...queryParams,
          },
        });

        const [open, inProgress, closed] = await Promise.all([
          ...caseStatuses.map((status) => {
            const { subCase } = constructQueryOptions({ status });
            return caseService.findSubCaseStatusStats({
              client,
              options: subCase ?? {},
              ids,
            });
          }),
        ]);

        return response.ok({
          body: SubCasesFindResponseRt.encode(
            transformSubCases({
              ...subCases,
              open,
              inProgress,
              closed,
              // there should only be one entry in the map for the requested case ID
              total: subCases.subCasesMap.get(request.params.case_id)?.length ?? 0,
            })
          ),
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
