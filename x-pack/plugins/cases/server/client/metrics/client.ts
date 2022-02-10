/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseMetricsResponse, CasesStatusRequest, CasesStatusResponse } from '../../../common/api';
import { CasesClient } from '../client';

import { CasesClientArgs } from '../types';
import { getStatusTotalsByType } from './get_cases_metrics';

import { getCaseMetrics, CaseMetricsParams } from './get_case_metrics';

/**
 * API for interacting with the metrics.
 */
export interface MetricsSubClient {
  getCaseMetrics(params: CaseMetricsParams): Promise<CaseMetricsResponse>;
  /**
   * Retrieves the total number of open, closed, and in-progress cases.
   */
  getStatusTotalsByType(params: CasesStatusRequest): Promise<CasesStatusResponse>;
}

/**
 * Creates the interface for retrieving metrics for cases.
 *
 * @ignore
 */
export const createMetricsSubClient = (
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): MetricsSubClient => {
  const casesSubClient: MetricsSubClient = {
    getCaseMetrics: (params: CaseMetricsParams) => getCaseMetrics(params, casesClient, clientArgs),
    getStatusTotalsByType: (params: CasesStatusRequest) =>
      getStatusTotalsByType(params, clientArgs),
  };

  return Object.freeze(casesSubClient);
};
