/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { TimeRange } from '../../../../../common/http_api/shared';
import type { ElasticsearchResponse } from '../../../../../common/types/es';

export enum MonitoredProduct {
  Cluster = 'cluster',
  Elasticsearch = 'elasticsearch',
  Kibana = 'kibana',
  Beats = 'beat',
  Logstash = 'logstash',
  EnterpriseSearch = 'enterpriseSearch',
}
export type MetricbeatMonitoredProduct = Exclude<MonitoredProduct, MonitoredProduct.Cluster>;
export type PackagesMonitoredProduct = Exclude<
  MetricbeatMonitoredProduct,
  MonitoredProduct.EnterpriseSearch
>;

export type SearchFn = (params: any) => Promise<ElasticsearchResponse>;

export interface QueryOptions {
  timeRange?: TimeRange;
  timeout: number; // in seconds
}

export interface FetchParameters {
  timeout: number;
  timeRange: TimeRange;
  search: SearchFn;
  logger: Logger;
}

export interface FetchExecution {
  timedOut?: boolean;
  errors?: string[];
}
