/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface CspmUsage {
  indices: CspmIndicesStats;
  resources_stats: CspmResourcesStats[];
  accounts_stats: CspmAccountsStats[];
}

export interface CspmIndicesStats {
  findings: IndexStats | {};
  latest_findings: IndexStats | {};
  score: IndexStats | {};
}

export interface IndexStats {
  doc_count: number;
  deleted: number;
  size_in_bytes: number;
  last_doc_timestamp: string | null;
}

export interface CspmResourcesStats {
  account_id: string;
  resource_type: string;
  resource_type_doc_count: number;
  resource_sub_type: string;
  resource_sub_type_doc_count: number;
  passed_findings_count: number;
  failed_findings_count: number;
}
export interface CspmAccountsStats {
  account_id: string;
  posture_score: number;
  latest_findings_doc_count: number;
  benchmark_id: string;
  benchmark_name: string;
  benchmark_version: string;
  passed_findings_count: number;
  failed_findings_count: number;
  agents_count: number;
  nodes_count: number;
  pods_count: number;
}
