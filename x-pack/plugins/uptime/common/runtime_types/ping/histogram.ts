/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface HistogramDataPoint {
  upCount?: number;

  downCount?: number;

  x?: number;

  x0?: number;

  y?: number;
}

export interface GetPingHistogramParams {
  dateStart: string;
  dateEnd: string;
  filters?: string;
  monitorId?: string;
  bucketSize?: string;
  query?: string;
}

export interface HistogramResult {
  histogram: HistogramDataPoint[];
  minInterval: number;
}
