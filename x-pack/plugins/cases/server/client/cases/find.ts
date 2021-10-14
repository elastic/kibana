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
  caseStatuses,
  CasesFindResponseRt,
  excess,
} from '../../../common';

import { createCaseError, transformCases } from '../../common';
import { constructQueryOptions } from '../utils';
import { includeFieldsRequiredForAuthentication } from '../../authorization/utils';
import { Operations } from '../../authorization';
import { CasesClientArgs } from '..';

/**
 * Retrieves a case and optionally its comments and sub case comments.
 *
 * @ignore
 */
export const find = async (
  params: CasesFindRequest,
  clientArgs: CasesClientArgs
): Promise<CasesFindResponse> => {
  const { unsecuredSavedObjectsClient, caseService, authorization, logger } = clientArgs;

  try {
    const queryParams = pipe(
      excess(CasesFindRequestRt).decode(params),
      fold(throwErrors(Boom.badRequest), identity)
    );

    const { filter: authorizationFilter, ensureSavedObjectsAreAuthorized } =
      await authorization.getAuthorizationFilter(Operations.findCases);

    const queryArgs = {
      tags: queryParams.tags,
      reporters: queryParams.reporters,
      sortByField: queryParams.sortField,
      status: queryParams.status,
      caseType: queryParams.type,
      owner: queryParams.owner,
    };

    const caseQueries = constructQueryOptions({ ...queryArgs, authorizationFilter });
    const cases = await caseService.findCasesGroupedByID({
      unsecuredSavedObjectsClient,
      caseOptions: {
        ...queryParams,
        ...caseQueries.case,
        searchFields:
          queryParams.searchFields != null
            ? Array.isArray(queryParams.searchFields)
              ? queryParams.searchFields
              : [queryParams.searchFields]
            : queryParams.searchFields,
        fields: includeFieldsRequiredForAuthentication(queryParams.fields),
      },
      subCaseOptions: caseQueries.subCase,
    });

    ensureSavedObjectsAreAuthorized([...cases.casesMap.values()]);

    // casesStatuses are bounded by us. No need to limit concurrent calls.
    const [openCases, inProgressCases, closedCases] = await Promise.all([
      ...caseStatuses.map((status) => {
        const statusQuery = constructQueryOptions({ ...queryArgs, status, authorizationFilter });
        return caseService.findCaseStatusStats({
          unsecuredSavedObjectsClient,
          caseOptions: statusQuery.case,
          subCaseOptions: statusQuery.subCase,
          ensureSavedObjectsAreAuthorized,
        });
      }),
    ]);

    return CasesFindResponseRt.encode(
      transformCases({
        casesMap: cases.casesMap,
        page: cases.page,
        perPage: cases.perPage,
        total: cases.total,
        countOpenCases: openCases,
        countInProgressCases: inProgressCases,
        countClosedCases: closedCases,
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
