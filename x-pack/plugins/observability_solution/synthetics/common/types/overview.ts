/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface TrendKey {
  configId: string;
  locationId: string;
}

export type TrendRequest = TrendKey & { schedule: string };

export interface TrendDatum {
  x: number;
  y: number;
}

export interface OverviewTrend {
  configId: string;
  locationId: string;
  data: TrendDatum[];
  count: number;
  min: number;
  max: number;
  avg: number;
  sum: number;
  median: number;
}

export type TrendTable = Record<string, OverviewTrend | null | 'loading'>;

export interface GetTrendPayload {
  trendStats: TrendTable;
  batch: TrendRequest[];
}
