/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import Boom from '@hapi/boom';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import type { CasesMetricsRequest, CasesMetricsResponse } from '../../../common/api';
import { CasesMetricsRequestRt, CasesMetricsResponseRt, throwErrors } from '../../../common/api';
import { createCaseError } from '../../common/error';
import type { CasesClient } from '../client';
import type { CasesClientArgs } from '../types';
import { buildHandlers } from './utils';

export const getCasesMetrics = async (
  params: CasesMetricsRequest,
  casesClient: CasesClient,
  clientArgs: CasesClientArgs
): Promise<CasesMetricsResponse> => {
  const { logger } = clientArgs;

  const queryParams = pipe(
    CasesMetricsRequestRt.decode(params),
    fold(throwErrors(Boom.badRequest), identity)
  );

  try {
    const handlers = buildHandlers(queryParams, casesClient, clientArgs);

    const computedMetrics = await Promise.all(
      Array.from(handlers).map(async (handler) => {
        return handler.compute();
      })
    );

    const mergedResults = computedMetrics.reduce((acc, metric) => {
      return merge(acc, metric);
    }, {}) as CasesMetricsResponse;

    return CasesMetricsResponseRt.encode(mergedResults);
  } catch (error) {
    throw createCaseError({
      logger,
      message: `Failed to retrieve metrics within client for cases: ${error}`,
      error,
    });
  }
};
