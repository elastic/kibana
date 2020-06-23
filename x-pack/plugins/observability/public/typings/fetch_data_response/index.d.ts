/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface Percentage {
  label: string;
  pct: number;
  color?: string;
}
interface Bytes {
  label: string;
  bytes: number;
  color?: string;
}
interface Numeral {
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
  stats: Record<string, Numeral>;
  series: Record<string, Series>;
}

export interface MetricsFetchDataResponse extends FetchDataResponse {
  stats: {
    hosts: Numeral;
    cpu: Percentage;
    memory: Percentage;
    disk: Percentage;
    inboundTraffic: Bytes;
    outboundTraffic: Bytes;
  };
  series: {
    inboundTraffic: Series;
    outboundTraffic: Series;
  };
}

export interface UptimeFetchDataResponse extends FetchDataResponse {
  stats: {
    monitors: Numeral;
    up: Numeral;
    down: Numeral;
  };
  series: {
    up: Series;
    down: Series;
  };
}

export interface ApmFetchDataResponse extends FetchDataResponse {
  stats: {
    services: Numeral;
    transactions: Numeral;
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
