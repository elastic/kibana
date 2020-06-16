/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface Percentage {
  pct: number;
}
interface Bytes {
  bytes: number;
}
interface Numeral {
  numeral: number;
}

interface Color {
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

interface FetchDataResponse {
  title: string;
  appLink: string;
  series: Series[];
}

interface LogsFetchDataResponse extends FetchDataResponse {
  stats: {
    [logName: string]: Numeral;
  };
}

interface MetricsFetchDataResponse extends FetchDataResponse {
  stats: {
    cpu: Percentage & Color;
    memory: Percentage & Color;
    disk: Percentage & Color;
    inboundTraffic: Bytes & Color;
    outboundTraffic: Bytes & Color;
  };
}

interface UptimeFetchDataResponse extends FetchDataResponse {
  stats: {
    monitors: Numeral & Color;
    up: Numeral & Color;
    down: Numeral & Color;
  };
}

interface ApmFetchDataResponse extends FetchDataResponse {
  stats: {
    services: Numeral & Color;
    transactions: Numeral & Color;
    errorRate?: Percentage & Color;
  };
}

export interface ObservabilityFetchDataResponse {
  apm: ApmFetchDataResponse;
  infra_metrics: MetricsFetchDataResponse;
  infra_logs: LogsFetchDataResponse;
  uptime: UptimeFetchDataResponse;
}

interface FetchDataParams {
  // The start timestamp in milliseconds of the queried time interval
  startTime: string;
  // The end timestamp in milliseconds of the queried time interval
  endTime: string;
  // The aggregation bucket size in milliseconds if applicable to the data source
  bucketSize: string;
}

type FetchData<T extends FetchDataResponse = FetchDataResponse> = (
  fetchDataParams: FetchDataParams
) => Promise<T>;
type HasData = () => Promise<boolean>;
