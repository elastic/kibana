/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface ChartData {
  time: number;
  value: number;
  group: string;
}

export interface SearchParams {
  start: number;
  end: number;
}

export type ChartDataFetcher = (searchParams: SearchParams) => Promise<ChartData[]>;
