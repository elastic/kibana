/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LatencyAggregationType } from '../../../common/latency_aggregation_types';
import { UxLocalUIFilterName } from '../../../common/ux_ui_filter';
import { TimeRangeComparisonType } from '../../components/shared/time_comparison/get_time_range_comparison';

export type UrlParams = {
  detailTab?: string;
  end?: string;
  flyoutDetailTab?: string;
  kuery?: string;
  environment?: string;
  rangeFrom?: string;
  rangeTo?: string;
  exactStart?: string;
  exactEnd?: string;
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
} & Partial<Record<UxLocalUIFilterName, string>>;

export type UxUrlParams = UrlParams;
export type ApmUrlParams = Omit<UrlParams, 'environment' | 'kuery'>;
