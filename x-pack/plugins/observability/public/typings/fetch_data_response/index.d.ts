/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface Stat {
  type: 'number' | 'percent' | 'bytesPerSecond';
  label: string;
  value: number;
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
}

export interface FetchDataResponse {
  title: string;
  appLink: string;
}

export interface LogsFetchDataResponse extends FetchDataResponse {
  stats: Record<string, Stat>;
  series: Record<string, Series>;
}

export interface MetricsFetchDataResponse extends FetchDataResponse {
  stats: {
    hosts: Stat;
    cpu: Stat;
    memory: Stat;
    disk: Stat;
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
