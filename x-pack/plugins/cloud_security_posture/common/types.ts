/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackagePolicy, AgentPolicy } from '@kbn/fleet-plugin/common';
import type { CspRuleMetadata } from './schemas/csp_rule_metadata';

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
  resourcesEvaluated: number;
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
    clusterName?: string;
    benchmarkName: string;
    benchmarkId: BenchmarkId;
    lastUpdate: string;
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

export type CspStatusCode =
  | 'indexed' // latest findings index exists and has results
  | 'indexing' // index timeout was not surpassed since installation, assumes data is being indexed
  | 'index-timeout' // index timeout was surpassed since installation
  | 'not-deployed' // no healthy agents were deployed
  | 'not-installed'; // number of installed csp integrations is 0;

interface BaseCspSetupStatus {
  latestPackageVersion: string;
  installedPackagePolicies: number;
  healthyAgents: number;
}

interface CspSetupNotInstalledStatus extends BaseCspSetupStatus {
  status: Extract<CspStatusCode, 'not-installed'>;
}

interface CspSetupInstalledStatus extends BaseCspSetupStatus {
  status: Exclude<CspStatusCode, 'not-installed'>;
  // if installedPackageVersion == undefined but status != 'not-installed' it means the integration was installed in the past and findings were found
  // status can be `indexed` but return with undefined package information in this case
  installedPackageVersion: string | undefined;
}

export type CspSetupStatus = CspSetupInstalledStatus | CspSetupNotInstalledStatus;

export interface CspRulesStatus {
  all: number;
  enabled: number;
  disabled: number;
}

export type AgentPolicyStatus = Pick<AgentPolicy, 'id' | 'name'> & { agents: number };

export interface Benchmark {
  package_policy: PackagePolicy;
  agent_policy: AgentPolicyStatus;
  rules: CspRulesStatus;
}

export type BenchmarkId = CspRuleMetadata['benchmark']['id'];
export type BenchmarkName = CspRuleMetadata['benchmark']['name'];
