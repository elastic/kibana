/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricTypes } from '../../common/rest_types';

export type DataPoint = [number, number]; // [timestamp, value]

export interface MetricSeries {
  name: string; // Name of the data stream
  data: DataPoint[]; // Array of data points in tuple format [timestamp, value]
}
// Use MetricTypes dynamically as keys for the Metrics interface
export type Metrics = Partial<Record<MetricTypes, MetricSeries[]>>;

export interface MetricsResponse {
  metrics: Metrics;
}
export interface MetricsResponse {
  metrics: Metrics;
}
