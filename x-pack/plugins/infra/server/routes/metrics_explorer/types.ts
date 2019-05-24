/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraWrappableRequest } from '../../lib/adapters/framework';

export interface InfraTimerange {
  field: string;
  from: number;
  to: number;
  interval: string;
}

export enum MetricsExplorerAggregation {
  avg = 'avg',
  max = 'max',
  min = 'min',
  cardinality = 'cardinality',
  rate = 'rate',
  count = 'count',
}

export interface MetricsExplorerMetric {
  aggregation: MetricsExplorerAggregation;
  field?: string | null;
}

export interface MetricsExplorerRequest {
  timerange: InfraTimerange;
  indexPattern: string;
  metrics: MetricsExplorerMetric[];
  groupBy?: string;
  afterKey?: string;
  limit?: number;
  filterQuery?: string;
}

export type MetricsExplorerWrappedRequest = InfraWrappableRequest<MetricsExplorerRequest>;

export interface MetricsExplorerPageInfo {
  total: number;
  afterKey?: string | null;
}

export enum MetricsExplorerColumnType {
  date = 'date',
  number = 'number',
  string = 'string',
}

export interface MetricsExplorerColumn {
  name: string;
  type: MetricsExplorerColumnType;
}

export interface MetricsExplorerRow {
  timestamp: number;
  [key: string]: string | number | null | undefined;
}

export interface MetricsExplorerSeries {
  id: string;
  columns: MetricsExplorerColumn[];
  rows: MetricsExplorerRow[];
}

export interface MetricsExplorerResponse {
  series: MetricsExplorerSeries[];
  pageInfo: MetricsExplorerPageInfo;
}
