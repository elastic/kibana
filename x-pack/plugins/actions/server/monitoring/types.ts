/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { MetricResult } from '../../../monitoring_collection/server';

export type ClusterActionsMetric = MetricResult<{
  overdue: {
    count: number;
    delay: {
      p50: number;
      p99: number;
    };
  };
}>;

export type NodeActionsMetric = MetricResult<{
  failures: number | null;
  executions: number | null;
  timeouts: number | null;
}>;
