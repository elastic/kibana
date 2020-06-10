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
  // The start timestamp in milliseconds of the queried time interval
  startTime: number;
  // The end timestamp in milliseconds of the queried time interval
  endTime: number;
  // The aggregation bucket size in milliseconds if applicable to the data source
  bucketSize: number;
}

export type ChartDataFetcher = (searchParams: SearchParams) => Promise<ChartData[]>;
