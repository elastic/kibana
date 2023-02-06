/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SingleCaseMetricsResponse,
  CasesMetricsRequest,
  CasesStatusRequest,
  CasesStatusResponse,
  SingleCaseMetricsRequest,
  CasesMetricsResponse,
} from '../../../common/api';
import type { CasesClient } from '../client';

import type { CasesClientArgs } from '../types';
import { getStatusTotalsByType } from './get_status_totals';
import { getCaseMetrics } from './get_case_metrics';
import { getCasesMetrics } from './get_cases_metrics';

/**
 * API for interacting with the metrics.
 */
export interface MetricsSubClient {
  getCaseMetrics(params: SingleCaseMetricsRequest): Promise<SingleCaseMetricsResponse>;
  getCasesMetrics(params: CasesMetricsRequest): Promise<CasesMetricsResponse>;
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
    getCaseMetrics: (params: SingleCaseMetricsRequest) =>
      getCaseMetrics(params, casesClient, clientArgs),
    getCasesMetrics: (params: CasesMetricsRequest) =>
      getCasesMetrics(params, casesClient, clientArgs),
    getStatusTotalsByType: (params: CasesStatusRequest) =>
      getStatusTotalsByType(params, clientArgs),
  };

  return Object.freeze(casesSubClient);
};
