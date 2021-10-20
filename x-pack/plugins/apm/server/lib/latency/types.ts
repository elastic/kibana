/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FieldValuePair,
  SearchStrategyClientParams,
} from '../../../common/search_strategies/types';

import { Setup } from '../helpers/setup_request';

export interface OverallLatencyDistributionOptions
  extends SearchStrategyClientParams {
  percentileThreshold: number;
  termFilters?: FieldValuePair[];
  setup: Setup;
}

export interface OverallLatencyDistributionResponse {
  log: string[];
  percentileThresholdValue?: number;
  overallHistogram?: Array<{
    key: number;
    doc_count: number;
  }>;
}
