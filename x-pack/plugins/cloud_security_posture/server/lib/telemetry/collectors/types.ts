/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface CspmUsage {
  indices: CspmIndicesStats;
  accounts: CspmAccountsStats[] | [];
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

export interface ResourceStats {
  [key: string]: { doc_count: number; passed: number; failed: number };
}
export interface CspmAccountsStats {
  account_id: string;
  account_score: number;
  latest_findings_doc_count: number;
  agents_count: number;
  resource_type: ResourceStats;
}
