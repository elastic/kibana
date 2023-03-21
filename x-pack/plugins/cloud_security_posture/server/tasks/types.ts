/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ScoreByPolicyTemplateBucket {
  score_by_policy_template: {
    buckets: Array<{
      key: string; // policy template
      doc_count: number;
      passed_findings: { doc_count: number };
      failed_findings: { doc_count: number };
      total_findings: { value: number };
      score_by_cluster_id: {
        buckets: Array<{
          key: string; // cluster id
          passed_findings: { doc_count: number };
          failed_findings: { doc_count: number };
          total_findings: { value: number };
        }>;
      };
    }>;
  };
}

export type TaskHealthStatus = 'ok' | 'warning' | 'error';

export interface FindingsStatsTaskResult {
  state: {
    runs: number;
    health_status: TaskHealthStatus;
  };
}
