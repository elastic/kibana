/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import Boom from '@hapi/boom';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import type { CasesFindResponse, CasesFindRequest } from '../../../common/api';
import { CasesFindRequestRt, throwErrors, CasesFindResponseRt, excess } from '../../../common/api';

import { createCaseError } from '../../common/error';
import { asArray, transformCases } from '../../common/utils';
import { constructQueryOptions, constructSearch } from '../utils';
import { includeFieldsRequiredForAuthentication } from '../../authorization/utils';
import { Operations } from '../../authorization';
import type { CasesClientArgs } from '..';
import { LICENSING_CASE_ASSIGNMENT_FEATURE } from '../../common/constants';
import type { CasesFindQueryParams } from '../types';

/**
 * Retrieves a case and optionally its comments.
 *
 * @ignore
 */
export const find = async (
  params: CasesFindRequest,
  clientArgs: CasesClientArgs
): Promise<CasesFindResponse> => {
  const {
    services: { caseService, licensingService },
    authorization,
    logger,
    savedObjectsSerializer,
    spaceId,
  } = clientArgs;

  try {
    const fields = asArray(params.fields);

    const queryParams = pipe(
      excess(CasesFindRequestRt).decode({ ...params, fields }),
      fold(throwErrors(Boom.badRequest), identity)
    );

    const { filter: authorizationFilter, ensureSavedObjectsAreAuthorized } =
      await authorization.getAuthorizationFilter(Operations.findCases);

    /**
     * Assign users to a case is only available to Platinum+
     */

    if (!isEmpty(queryParams.assignees)) {
      const hasPlatinumLicenseOrGreater = await licensingService.isAtLeastPlatinum();

      if (!hasPlatinumLicenseOrGreater) {
        throw Boom.forbidden(
          'In order to filter cases by assignees, you must be subscribed to an Elastic Platinum license'
        );
      }

      licensingService.notifyUsage(LICENSING_CASE_ASSIGNMENT_FEATURE);
    }

    const queryArgs: CasesFindQueryParams = {
      tags: queryParams.tags,
      reporters: queryParams.reporters,
      sortByField: queryParams.sortField,
      status: queryParams.status,
      severity: queryParams.severity,
      owner: queryParams.owner,
      from: queryParams.from,
      to: queryParams.to,
      assignees: queryParams.assignees,
    };

    const statusStatsOptions = constructQueryOptions({
      ...queryArgs,
      status: undefined,
      authorizationFilter,
    });

    const caseQueryOptions = constructQueryOptions({ ...queryArgs, authorizationFilter });

    const caseSearch = constructSearch(queryParams.search, spaceId, savedObjectsSerializer);

    const [cases, statusStats] = await Promise.all([
      caseService.findCasesGroupedByID({
        caseOptions: {
          ...queryParams,
          ...caseQueryOptions,
          ...caseSearch,
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
