/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface CspmUsage {
  indices: CspmIndicesStats;
  accounts: CspmAccountsStats;
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

export interface FindingsStats {
  doc_count: number;
  passed: number;
  failed: number;
}

export interface LatestFindingsStats extends FindingsStats {
  by_resource_type: {
    [key: string]: FindingsStats;
  };
}
export interface CspmAccountsStats extends LatestFindingsStats {
  account_id: string;
  latest_findings_doc_count: number;
  agents_count: number;
  account_score?: number;
}
