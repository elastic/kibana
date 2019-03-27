/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface InfraTimerange {
  field: string;
  from: number;
  to: number;
  interval: string;
}

export interface MetricsExplorerMetric {
  aggregation: string;
  field?: string | null;
  rate?: boolean;
}

export interface MetricsExplorerRequest {
  timerange: InfraTimerange;
  indexPattern: string;
  metrics: MetricsExplorerMetric[];
  groupBy: string;
  afterKey: string;
  limit: number;
}

export interface MetricsExplorerPageInfo {
  total: number;
  afterKey?: string | null;
}

enum MetricsExplorerColumnType {
  date,
  number,
  string,
}

export interface MetricsExplorerColumn {
  name: string;
  type: MetricsExplorerColumnType;
}

export interface MetricsExplorerRow {
  timestamp: number;
  value: number;
  [key: string]: string | number;
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
