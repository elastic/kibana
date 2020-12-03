/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LocalUIFilterName } from '../../../common/ui_filter';
// TODO: caue fix it
import { AggregationType } from '../../components/app/service_overview/latency_chart';

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
  aggregationType?: AggregationType;
} & Partial<Record<LocalUIFilterName, string>>;
