/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
}

export interface HistogramResult {
  histogram: HistogramDataPoint[];
  interval: string;
}

export interface HistogramQueryResult {
  key: number;
  key_as_string: string;
  doc_count: number;
  down: {
    doc_count: number;
  };
  up: {
    doc_count: number;
  };
}
