/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { MetricKey } from '../../common/types';

export interface DataPoint {
  x: number;
  y: number;
}

export interface Series {
  streamName: string;
  data: DataPoint[];
}
export interface Chart {
  key: MetricKey;
  series: Series[];
}

export interface MetricsResponse {
  charts: Chart[];
}
