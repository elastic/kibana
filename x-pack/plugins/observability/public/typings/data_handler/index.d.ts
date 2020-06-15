/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface Stat {
  label: string;
  value: string;
  color?: string;
}

export interface Coordinates {
  x: number;
  y?: number;
}

interface Series {
  label: string;
  coordinates: Coordinates[];
  color?: string;
  key?: string;
}

export interface FetchDataResponse {
  title: string;
  appLink: string;
  stats: Stat[];
  series: Series[];
}
interface FetchDataParams {
  // The start timestamp in milliseconds of the queried time interval
  startTime: string;
  // The end timestamp in milliseconds of the queried time interval
  endTime: string;
  // The aggregation bucket size in milliseconds if applicable to the data source
  bucketSize: string;
}

export type FetchData = (fetchDataParams: FetchDataParams) => Promise<FetchDataResponse>;

export type HasData = () => Promise<boolean>;
