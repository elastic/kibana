/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Operations } from '../../authorization';
import type { CaseUserActionStatsResponse } from '../../../common/api';
import { CaseUserActionStatsResponseRt } from '../../../common/api';
import { createCaseError } from '../../common/error';
import type { CasesClientArgs } from '..';
import type { UserActionGet } from './types';

export const getStats = async (
  { caseId }: UserActionGet,
  clientArgs: CasesClientArgs
): Promise<CaseUserActionStatsResponse> => {
  const {
    services: { userActionService },
    logger,
    authorization,
  } = clientArgs;

  const { filter } = await authorization.getAuthorizationFilter(Operations.getUserActionStats);

  try {
    const totals = await userActionService.getCaseUserActionStats({
      caseId,
      filter,
    });

    return CaseUserActionStatsResponseRt.encode(totals);
  } catch (error) {
    throw createCaseError({
      message: `Failed to retrieve user actions case id: ${caseId}: ${error}`,
      error,
      logger,
    });
  }
};
