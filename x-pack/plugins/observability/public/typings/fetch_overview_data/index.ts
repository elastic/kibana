/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ObservabilityApp } from '../../../typings/common';

export interface Stat {
  type: 'number' | 'percent' | 'bytesPerSecond';
  value: number;
}

export interface Coordinates {
  x: number;
  y?: number;
}

export interface Series {
  coordinates: Coordinates[];
}

export interface FetchDataParams {
  absoluteTime: { start: number; end: number };
  relativeTime: { start: string; end: string };
  bucketSize: string;
}

export type FetchData<T extends FetchDataResponse = FetchDataResponse> = (
  fetchDataParams: FetchDataParams
) => Promise<T>;

export type HasData = () => Promise<boolean>;

export interface DataHandler<T extends ObservabilityApp = ObservabilityApp> {
  fetchData: FetchData<ObservabilityFetchDataResponse[T]>;
  hasData: HasData;
}

export interface FetchDataResponse {
  appLink: string;
}

export interface LogsFetchDataResponse extends FetchDataResponse {
  stats: Record<string, Stat & { label: string }>;
  series: Record<string, Series & { label: string }>;
}

export interface MetricsFetchDataResponse extends FetchDataResponse {
  stats: {
    hosts: Stat;
    cpu: Stat;
    memory: Stat;
    inboundTraffic: Stat;
    outboundTraffic: Stat;
  };
  series: {
    inboundTraffic: Series;
    outboundTraffic: Series;
  };
}

export interface UptimeFetchDataResponse extends FetchDataResponse {
  stats: {
    monitors: Stat;
    up: Stat;
    down: Stat;
  };
  series: {
    up: Series;
    down: Series;
  };
}

export interface ApmFetchDataResponse extends FetchDataResponse {
  stats: {
    services: Stat;
    transactions: Stat;
  };
  series: {
    transactions: Series;
  };
}

export interface ObservabilityFetchDataResponse {
  apm: ApmFetchDataResponse;
  infra_metrics: MetricsFetchDataResponse;
  infra_logs: LogsFetchDataResponse;
  uptime: UptimeFetchDataResponse;
}
