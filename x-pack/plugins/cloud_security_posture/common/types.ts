/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackagePolicy, AgentPolicy } from '@kbn/fleet-plugin/common';
import { CspFinding } from './schemas/csp_finding';
import { SUPPORTED_CLOUDBEAT_INPUTS, SUPPORTED_POLICY_TEMPLATES } from './constants';
import { CspRuleTemplateMetadata } from './schemas/csp_rule_template_metadata';

export type Evaluation = 'passed' | 'failed' | 'NA';

export type PostureTypes = 'cspm' | 'kspm' | 'all';
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
    assetIdentifierId: string;
    cloud: CspFinding['cloud'];
    benchmark: CspFinding['rule']['benchmark'];
    cluster: NonNullable<CspFinding['orchestrator']>['cluster'];
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
  | 'not-installed' // number of installed csp integrations is 0;
  | 'waiting_for_results'; // have healthy agents but no findings at all, assumes data is being indexed for the 1st time

export type IndexStatus =
  | 'not-empty' // Index contains documents
  | 'empty' // Index doesn't contain documents (or doesn't exist)
  | 'unprivileged'; // User doesn't have access to query the index

export interface IndexDetails {
  index: string;
  status: IndexStatus;
}

interface BaseCspSetupBothPolicy {
  status: CspStatusCode;
  installedPackagePolicies: number;
  healthyAgents: number;
}

export interface BaseCspSetupStatus {
  indicesDetails: IndexDetails[];
  latestPackageVersion: string;
  cspm: BaseCspSetupBothPolicy;
  kspm: BaseCspSetupBothPolicy;
  isPluginInitialized: boolean;
}

export type CspSetupStatus = BaseCspSetupStatus;

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
export type CloudSecurityPolicyTemplate = typeof SUPPORTED_POLICY_TEMPLATES[number];
export type PosturePolicyTemplate = Extract<CloudSecurityPolicyTemplate, 'kspm' | 'cspm'>;

// Vulnerability Integration Types
export type CVSSVersion = '2.0' | '3.0';
export type SeverityStatus = 'Low' | 'Medium' | 'High' | 'Critical';
