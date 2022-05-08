/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackagePolicy, GetAgentPoliciesResponseItem } from '@kbn/fleet-plugin/common';

export type Evaluation = 'passed' | 'failed' | 'NA';
/** number between 1-100 */
export type Score = number;

export interface FindingsEvaluation {
  totalFindings: number;
  totalPassed: number;
  totalFailed: number;
}

export interface Stats extends FindingsEvaluation {
  postureScore: Score;
}

export interface GroupedFindingsEvaluation extends FindingsEvaluation {
  name: string;
}

export interface PostureTrend extends Stats {
  timestamp: string;
}

export interface Cluster {
  meta: {
    clusterId: string;
    benchmarkName: string;
    lastUpdate: number; // unix epoch time
  };
  stats: Stats;
  groupedFindingsEvaluation: GroupedFindingsEvaluation[];
  trend: PostureTrend[];
}

export interface ComplianceDashboardData {
  stats: Stats;
  groupedFindingsEvaluation: GroupedFindingsEvaluation[];
  clusters: Cluster[];
  trend: PostureTrend[];
}

export interface CspRulesStatus {
  all: number;
  enabled: number;
  disabled: number;
}

export interface Benchmark {
  package_policy: Pick<
    PackagePolicy,
    | 'id'
    | 'name'
    | 'policy_id'
    | 'namespace'
    | 'package'
    | 'updated_at'
    | 'updated_by'
    | 'created_at'
    | 'created_by'
  >;
  agent_policy: Pick<GetAgentPoliciesResponseItem, 'id' | 'name' | 'agents'>;
  rules: CspRulesStatus;
}
