/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ObservabilityApp } from '../../../typings/common';
import { UXMetrics } from '../../components/shared/core_web_vitals';

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
  serviceName?: string;
}

export interface HasDataParams {
  absoluteTime: { start: number; end: number };
}

export interface UXHasDataResponse {
  hasData: boolean;
  serviceName: string | number | undefined;
}

export type FetchData<T extends FetchDataResponse = FetchDataResponse> = (
  fetchDataParams: FetchDataParams
) => Promise<T>;

export type HasData<T extends ObservabilityFetchDataPlugins> = (
  params?: HasDataParams
) => Promise<ObservabilityHasDataResponse[T]>;

export type ObservabilityFetchDataPlugins = Exclude<
  ObservabilityApp,
  'observability-overview' | 'stack_monitoring'
>;

export interface DataHandler<
  T extends ObservabilityFetchDataPlugins = ObservabilityFetchDataPlugins
> {
  fetchData: FetchData<ObservabilityFetchDataResponse[T]>;
  hasData: HasData<T>;
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

export interface UxFetchDataResponse extends FetchDataResponse {
  coreWebVitals: UXMetrics;
}

export interface ObservabilityFetchDataResponse {
  apm: ApmFetchDataResponse;
  infra_metrics: MetricsFetchDataResponse;
  infra_logs: LogsFetchDataResponse;
  uptime: UptimeFetchDataResponse;
  ux: UxFetchDataResponse;
}

export interface ObservabilityHasDataResponse {
  apm: boolean;
  infra_metrics: boolean;
  infra_logs: boolean;
  uptime: boolean;
  ux: UXHasDataResponse;
}
