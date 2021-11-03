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

import { CasesClientArgs } from '..';
import {
  CasesStatusRequest,
  CasesStatusResponse,
  CasesStatusResponseRt,
  caseStatuses,
  throwErrors,
  excess,
  CasesStatusRequestRt,
} from '../../../common';
import { Operations } from '../../authorization';
import { createCaseError } from '../../common';
import { constructQueryOptions } from '../utils';

/**
 * Statistics API contract.
 */
export interface StatsSubClient {
  /**
   * Retrieves the total number of open, closed, and in-progress cases.
   */
  getStatusTotalsByType(params: CasesStatusRequest): Promise<CasesStatusResponse>;
}

/**
 * Creates the interface for retrieving the number of open, closed, and in progress cases.
 *
 * @ignore
 */
export function createStatsSubClient(clientArgs: CasesClientArgs): StatsSubClient {
  return Object.freeze({
    getStatusTotalsByType: (params: CasesStatusRequest) =>
      getStatusTotalsByType(params, clientArgs),
  });
}

async function getStatusTotalsByType(
  params: CasesStatusRequest,
  clientArgs: CasesClientArgs
): Promise<CasesStatusResponse> {
  const { unsecuredSavedObjectsClient, caseService, logger, authorization } = clientArgs;

  try {
    const queryParams = pipe(
      excess(CasesStatusRequestRt).decode(params),
      fold(throwErrors(Boom.badRequest), identity)
    );

    const { filter: authorizationFilter, ensureSavedObjectsAreAuthorized } =
      await authorization.getAuthorizationFilter(Operations.getCaseStatuses);

    // casesStatuses are bounded by us. No need to limit concurrent calls.
    const [openCases, inProgressCases, closedCases] = await Promise.all([
      ...caseStatuses.map((status) => {
        const statusQuery = constructQueryOptions({
          owner: queryParams.owner,
          status,
          authorizationFilter,
        });
        return caseService.findCaseStatusStats({
          unsecuredSavedObjectsClient,
          caseOptions: statusQuery.case,
          subCaseOptions: statusQuery.subCase,
          ensureSavedObjectsAreAuthorized,
        });
      }),
    ]);

    return CasesStatusResponseRt.encode({
      count_open_cases: openCases,
      count_in_progress_cases: inProgressCases,
      count_closed_cases: closedCases,
    });
  } catch (error) {
    throw createCaseError({ message: `Failed to get status stats: ${error}`, error, logger });
  }
}
