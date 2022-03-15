/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimeRangeComparisonType } from '../../../common/runtime_types/comparison_type_rt';
import { LatencyAggregationType } from '../../../common/latency_aggregation_types';

export interface UrlParams {
  detailTab?: string;
  end?: string;
  flyoutDetailTab?: string;
  kuery?: string;
  environment?: string;
  rangeFrom?: string;
  rangeTo?: string;
  refreshInterval?: number;
  refreshPaused?: boolean;
  sortDirection?: string;
  sortField?: string;
  start?: string;
  sampleRangeFrom?: number;
  sampleRangeTo?: number;
  traceId?: string;
  transactionId?: string;
  transactionName?: string;
  transactionType?: string;
  waterfallItemId?: string;
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  percentile?: number;
  latencyAggregationType?: LatencyAggregationType;
  comparisonEnabled?: boolean;
  comparisonType?: TimeRangeComparisonType;
}

export type UxUrlParams = UrlParams;
export type ApmUrlParams = Omit<UrlParams, 'environment' | 'kuery'>;
