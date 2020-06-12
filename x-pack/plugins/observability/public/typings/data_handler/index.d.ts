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

interface Coordinates {
  x: number;
  y: number;
}

interface Series {
  label: string;
  coordinates: Coordinates[];
  color?: string;
  key?: string;
}

interface FetchDataResponse {
  title: string;
  appLink: string;
  stats: Stat[];
  series: Series[];
}
interface FetchDataParams {
  // The start timestamp in milliseconds of the queried time interval
  startTime: number;
  // The end timestamp in milliseconds of the queried time interval
  endTime: number;
  // The aggregation bucket size in milliseconds if applicable to the data source
  bucketSize: number;
}

export type FetchData = (fetchDataParams: FetchDataParams) => Promise<FetchDataResponse[] | []>;

export type HasData = () => Promise<boolean>;
