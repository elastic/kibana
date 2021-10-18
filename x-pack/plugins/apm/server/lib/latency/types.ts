/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Setup } from '../helpers/setup_request';
import { CorrelationsOptions } from '../search_strategies/queries/get_filters';

export interface OverallLatencyDistributionOptions extends CorrelationsOptions {
  percentileThreshold: number;
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
