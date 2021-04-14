/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesClientArgs } from '..';
import { CasesStatusResponse, CasesStatusResponseRt, caseStatuses } from '../../../common/api';
import { createCaseError } from '../../common/error';
import { constructQueryOptions } from '../utils';

/**
 * Statistics API contract.
 */
export interface StatsSubClient {
  getStatusTotalsByType(): Promise<CasesStatusResponse>;
}

/**
 * Creates the interface for retrieving the number of open, closed, and in progress cases.
 */
export function createStatsSubClient(clientArgs: CasesClientArgs): StatsSubClient {
  return Object.freeze({
    getStatusTotalsByType: () => getStatusTotalsByType(clientArgs),
  });
}

async function getStatusTotalsByType({
  savedObjectsClient: soClient,
  caseService,
  logger,
}: CasesClientArgs): Promise<CasesStatusResponse> {
  try {
    const [openCases, inProgressCases, closedCases] = await Promise.all([
      ...caseStatuses.map((status) => {
        const statusQuery = constructQueryOptions({ status });
        return caseService.findCaseStatusStats({
          soClient,
          caseOptions: statusQuery.case,
          subCaseOptions: statusQuery.subCase,
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
