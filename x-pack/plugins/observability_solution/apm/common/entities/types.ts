/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum EntityDataStreamType {
  METRICS = 'metrics',
  TRACES = 'traces',
  LOGS = 'logs',
}

interface TraceMetrics {
  latency?: number | null;
  throughput?: number | null;
  failedTransactionRate?: number | null;
}

interface LogsMetrics {
  logRate?: number | null;
  logErrorRate?: number | null;
}

export type EntityMetrics = TraceMetrics & LogsMetrics;
