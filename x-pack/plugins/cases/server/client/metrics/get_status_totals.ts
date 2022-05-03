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
  CasesStatusRequest,
  CasesStatusResponse,
  excess,
  CasesStatusRequestRt,
  throwErrors,
  CasesStatusResponseRt,
} from '../../../common/api';
import { CasesClientArgs } from '../types';
import { Operations } from '../../authorization';
import { constructQueryOptions } from '../utils';
import { createCaseError } from '../../common/error';

export async function getStatusTotalsByType(
  params: CasesStatusRequest,
  clientArgs: CasesClientArgs
): Promise<CasesStatusResponse> {
  const { caseService, logger, authorization } = clientArgs;

  try {
    const queryParams = pipe(
      excess(CasesStatusRequestRt).decode(params),
      fold(throwErrors(Boom.badRequest), identity)
    );

    const { filter: authorizationFilter } = await authorization.getAuthorizationFilter(
      Operations.getCaseStatuses
    );

    const options = constructQueryOptions({
      owner: queryParams.owner,
      from: queryParams.from,
      to: queryParams.to,
      authorizationFilter,
    });

    const statusStats = await caseService.getCaseStatusStats({
      searchOptions: options,
    });

    return CasesStatusResponseRt.encode({
      count_open_cases: statusStats.open,
      count_in_progress_cases: statusStats['in-progress'],
      count_closed_cases: statusStats.closed,
    });
  } catch (error) {
    throw createCaseError({ message: `Failed to get status stats: ${error}`, error, logger });
  }
}
