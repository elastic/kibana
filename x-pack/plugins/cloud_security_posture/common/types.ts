/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackagePolicy, AgentPolicy } from '@kbn/fleet-plugin/common';
import { SUPPORTED_CLOUDBEAT_INPUTS, SUPPORTED_POLICY_TEMPLATES } from './constants';
import type { CspRuleTemplateMetadata } from './schemas/csp_rule_template_metadata';

export type Evaluation = 'passed' | 'failed' | 'NA';
/** number between 1-100 */
export type Score = number;

export interface FindingsEvaluation {
  totalFindings: number;
  totalPassed: number;
  totalFailed: number;
  postureScore: Score;
}

export interface Stats extends FindingsEvaluation {
  resourcesEvaluated?: number;
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
  | 'unprivileged' // user lacks privileges for the latest findings index
  | 'index-timeout' // index timeout was surpassed since installation
  | 'not-deployed' // no healthy agents were deployed
  | 'not-installed'; // number of installed csp integrations is 0;

export type IndexStatus =
  | 'not-empty' // Index contains documents
  | 'empty' // Index doesn't contain documents (or doesn't exist)
  | 'unprivileged'; // User doesn't have access to query the index

export interface IndexDetails {
  index: string;
  status: IndexStatus;
}

interface BaseCspSetupStatus {
  indicesDetails: IndexDetails[];
  latestPackageVersion: string;
  installedPackagePolicies: number;
  healthyAgents: number;
  isPluginInitialized: boolean;
  installedPolicyTemplates: PosturePolicyTemplate[];
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

export type AgentPolicyStatus = Pick<AgentPolicy, 'id' | 'name'> & { agents: number };

export interface Benchmark {
  package_policy: PackagePolicy;
  agent_policy: AgentPolicyStatus;
  rules_count: number;
}

export type BenchmarkId = CspRuleTemplateMetadata['benchmark']['id'];
export type BenchmarkName = CspRuleTemplateMetadata['benchmark']['name'];

// Fleet Integration types
export type PostureInput = typeof SUPPORTED_CLOUDBEAT_INPUTS[number];
export type PosturePolicyTemplate = typeof SUPPORTED_POLICY_TEMPLATES[number];
