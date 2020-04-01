/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface HistogramDataPoint {
  upCount?: number | null;

  downCount?: number | null;

  x?: number | null;

  x0?: number | null;

  y?: number | null;
}

export interface GetPingHistogramParams {
  dateStart: string;
  dateEnd: string;
  filters?: string;
  monitorId?: string;
  statusFilter?: string;
}

export interface HistogramResult {
  histogram: HistogramDataPoint[];
  interval: string;
}
