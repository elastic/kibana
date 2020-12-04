/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LatencyAggregationType } from '../../../common/latency_aggregation_types';
import { LocalUIFilterName } from '../../../common/ui_filter';

export type IUrlParams = {
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
} & Partial<Record<LocalUIFilterName, string>>;
