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
  CasesFindResponse,
  CasesFindRequest,
  CasesFindRequestRt,
  throwErrors,
  CasesFindResponseRt,
  excess,
} from '../../../common/api';

import { createCaseError } from '../../common/error';
import { asArray, transformCases } from '../../common/utils';
import { constructQueryOptions } from '../utils';
import { includeFieldsRequiredForAuthentication } from '../../authorization/utils';
import { Operations } from '../../authorization';
import { CasesClientArgs } from '..';

/**
 * Retrieves a case and optionally its comments.
 *
 * @ignore
 */
export const find = async (
  params: CasesFindRequest,
  clientArgs: CasesClientArgs
): Promise<CasesFindResponse> => {
  const { caseService, authorization, logger } = clientArgs;

  try {
    const fields = asArray(params.fields);

    const queryParams = pipe(
      excess(CasesFindRequestRt).decode({ ...params, fields }),
      fold(throwErrors(Boom.badRequest), identity)
    );

    const { filter: authorizationFilter, ensureSavedObjectsAreAuthorized } =
      await authorization.getAuthorizationFilter(Operations.findCases);

    const queryArgs = {
      tags: queryParams.tags,
      reporters: queryParams.reporters,
      sortByField: queryParams.sortField,
      status: queryParams.status,
      owner: queryParams.owner,
    };

    const statusStatsOptions = constructQueryOptions({
      ...queryArgs,
      status: undefined,
      authorizationFilter,
    });
    const caseQueryOptions = constructQueryOptions({ ...queryArgs, authorizationFilter });

    const [cases, statusStats] = await Promise.all([
      caseService.findCasesGroupedByID({
        caseOptions: {
          ...queryParams,
          ...caseQueryOptions,
          searchFields: asArray(queryParams.searchFields),
          fields: includeFieldsRequiredForAuthentication(fields),
        },
      }),
      caseService.getCaseStatusStats({
        searchOptions: statusStatsOptions,
      }),
    ]);

    ensureSavedObjectsAreAuthorized([...cases.casesMap.values()]);

    return CasesFindResponseRt.encode(
      transformCases({
        casesMap: cases.casesMap,
        page: cases.page,
        perPage: cases.perPage,
        total: cases.total,
        countOpenCases: statusStats.open,
        countInProgressCases: statusStats['in-progress'],
        countClosedCases: statusStats.closed,
      })
    );
  } catch (error) {
    throw createCaseError({
      message: `Failed to find cases: ${JSON.stringify(params)}: ${error}`,
      error,
      logger,
    });
  }
};
