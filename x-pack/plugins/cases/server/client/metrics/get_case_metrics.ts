/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { merge } from 'lodash';

import type { SingleCaseMetricsRequest, SingleCaseMetricsResponse } from '../../../common/api';
import { SingleCaseMetricsResponseRt } from '../../../common/api';
import { Operations } from '../../authorization';
import { createCaseError } from '../../common/error';
import type { CasesClient } from '../client';
import type { CasesClientArgs } from '../types';
import { buildHandlers } from './utils';

export const getCaseMetrics = async (
  params: SingleCaseMetricsRequest,
  casesClient: CasesClient,
  clientArgs: CasesClientArgs
): Promise<SingleCaseMetricsResponse> => {
  const { logger } = clientArgs;

  try {
    await checkAuthorization(params, clientArgs);
    const handlers = buildHandlers(params, casesClient, clientArgs);

    const computedMetrics = await Promise.all(
      Array.from(handlers).map(async (handler) => {
        return handler.compute();
      })
    );

    const mergedResults = computedMetrics.reduce((acc, metric) => {
      return merge(acc, metric);
    }, {}) as SingleCaseMetricsResponse;

    return SingleCaseMetricsResponseRt.encode(mergedResults);
  } catch (error) {
    throw createCaseError({
      logger,
      message: `Failed to retrieve metrics within client for case id: ${params.caseId}: ${error}`,
      error,
    });
  }
};

const checkAuthorization = async (
  params: SingleCaseMetricsRequest,
  clientArgs: CasesClientArgs
) => {
  const {
    services: { caseService },
    authorization,
  } = clientArgs;

  const caseInfo = await caseService.getCase({
    id: params.caseId,
  });

  await authorization.ensureAuthorized({
    operation: Operations.getCaseMetrics,
    entities: [{ owner: caseInfo.attributes.owner, id: caseInfo.id }],
  });
};
