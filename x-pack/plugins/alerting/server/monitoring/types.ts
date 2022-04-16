/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { MetricResult } from '@kbn/monitoring-collection-plugin/server';

export type ClusterRulesMetric = MetricResult<{
  overdue: {
    count: number;
    delay: {
      p50: number;
      p99: number;
    };
  };
}>;

export type NodeRulesMetric = MetricResult<{
  failures: number | null;
  executions: number | null;
  timeouts: number | null;
}>;
