/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AggregatedFindings {
  passed_findings: { doc_count: number };
  failed_findings: { doc_count: number };
  total_findings: { value: number };
}

export interface AggregatedFindingsByCluster extends AggregatedFindings {
  key: string;
}
export interface ScoreBucket extends AggregatedFindings {
  score_by_cluster_id: {
    buckets: AggregatedFindingsByCluster[];
  };
}

export type TaskHealthStatus = 'ok' | 'warning' | 'error';

export interface FindingsStatsTaskResult {
  state: {
    runs: number;
    health_status: TaskHealthStatus;
  };
}
