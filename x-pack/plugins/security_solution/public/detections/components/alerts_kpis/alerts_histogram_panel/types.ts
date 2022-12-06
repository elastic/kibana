/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface HistogramData {
  x: number;
  y: number;
  g: string;
}

export interface AlertsAggregation {
  alertsByGrouping: {
    buckets: AlertsGroupBucket[];
  };
}

export interface AlertsBucket {
  key_as_string: string;
  key: number;
  doc_count: number;
}

export interface AlertsGroupBucket {
  key: string | number;
  key_as_string?: string;
  alerts: {
    buckets: AlertsBucket[];
  };
  doc_count: number;
}

export interface AlertsTotal {
  value: number;
  relation: string;
}
