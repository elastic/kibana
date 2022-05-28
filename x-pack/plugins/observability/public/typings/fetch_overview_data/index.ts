/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObservabilityApp } from '../../../typings/common';
import { UXMetrics } from '../../components/shared/core_web_vitals';
import { ApmIndicesConfig } from '../../../common/typings';

export interface Stat {
  type: 'number' | 'percent' | 'bytesPerSecond';
  value: number;
}

export interface Coordinates {
  x: number;
  y?: number | null;
}

export interface Series {
  coordinates: Coordinates[];
}

export interface FetchDataParams {
  absoluteTime: { start: number; end: number };
  relativeTime: { start: string; end: string };
  serviceName?: string;
  // Bucket size in seconds (number)
  bucketSize: number;
  // Bucket size in seconds (string)
  intervalString: string;
}

export interface HasDataParams {
  absoluteTime: { start: number; end: number };
}

export interface HasDataResponse {
  hasData: boolean;
}

export interface UXHasDataResponse extends HasDataResponse {
  serviceName?: string | number;
  indices?: string;
}

export interface SyntheticsHasDataResponse extends HasDataResponse {
  indices: string;
}

export interface APMHasDataResponse {
  hasData: boolean;
  indices: ApmIndicesConfig;
}

export interface InfraMetricsHasDataResponse {
  hasData: boolean;
  indices: string;
}

export interface InfraLogsHasDataResponse {
  hasData: boolean;
  indices: string;
}

export type FetchData<T extends FetchDataResponse = FetchDataResponse> = (
  fetchDataParams: FetchDataParams
) => Promise<T>;

export type HasData<T extends ObservabilityFetchDataPlugins> = (
  params?: HasDataParams
) => Promise<ObservabilityHasDataResponse[T]>;

export type ObservabilityFetchDataPlugins = Exclude<
  ObservabilityApp,
  'observability-overview' | 'stack_monitoring' | 'uptime' | 'fleet'
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

export type StringOrNull = string | null;
export type NumberOrNull = number | null;

export interface MetricsFetchDataSeries {
  id: string;
  name: StringOrNull;
  platform: StringOrNull;
  provider: StringOrNull;
  cpu: NumberOrNull;
  iowait: NumberOrNull;
  load: NumberOrNull;
  uptime: NumberOrNull;
  rx: NumberOrNull;
  tx: NumberOrNull;
  timeseries: Array<{
    timestamp: number;
    cpu: NumberOrNull;
    iowait: NumberOrNull;
    load: NumberOrNull;
    rx: NumberOrNull;
    tx: NumberOrNull;
  }>;
}

export interface MetricsFetchDataResponse extends FetchDataResponse {
  sort: (by: string, direction: string) => Promise<MetricsFetchDataResponse>;
  series: MetricsFetchDataSeries[];
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
  synthetics: UptimeFetchDataResponse;
  ux: UxFetchDataResponse;
}

export interface ObservabilityHasDataResponse {
  apm: APMHasDataResponse;
  infra_metrics: InfraMetricsHasDataResponse;
  infra_logs: InfraLogsHasDataResponse;
  synthetics: SyntheticsHasDataResponse;
  ux: UXHasDataResponse;
}
