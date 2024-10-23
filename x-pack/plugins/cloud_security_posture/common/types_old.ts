/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { type TypeOf } from '@kbn/config-schema';
import type { CspBenchmarkRuleMetadata } from '@kbn/cloud-security-posture-common/schema/rules/latest';
import type { CspFinding } from '@kbn/cloud-security-posture-common';
import { SUPPORTED_CLOUDBEAT_INPUTS, SUPPORTED_POLICY_TEMPLATES } from './constants';

import { getComplianceDashboardSchema } from './schemas/stats';

export type AwsCredentialsType =
  | 'assume_role'
  | 'direct_access_keys'
  | 'temporary_keys'
  | 'shared_credentials'
  | 'cloud_formation';

export type AwsCredentialsTypeFieldMap = {
  [key in AwsCredentialsType]: string[];
};

export type GcpCredentialsType = 'credentials-file' | 'credentials-json' | 'credentials-none';

export type GcpCredentialsTypeFieldMap = {
  [key in GcpCredentialsType]: string[];
};

export type AzureCredentialsType =
  | 'arm_template'
  | 'manual' // TODO: remove for stack version 8.13
  | 'service_principal_with_client_secret'
  | 'service_principal_with_client_certificate'
  | 'service_principal_with_client_username_and_password'
  | 'managed_identity';

export type Evaluation = 'passed' | 'failed' | 'NA';

export type PostureTypes = 'cspm' | 'kspm' | 'vuln_mgmt' | 'all';
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

export interface BenchmarkData {
  meta: {
    benchmarkId: CspFinding['rule']['benchmark']['id'];
    benchmarkVersion: CspFinding['rule']['benchmark']['version'];
    benchmarkName: CspFinding['rule']['benchmark']['name'];
    assetCount: number;
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

export interface ComplianceDashboardDataV2 {
  stats: Stats;
  groupedFindingsEvaluation: GroupedFindingsEvaluation[];
  trend: PostureTrend[];
  benchmarks: BenchmarkData[];
}

export type BenchmarkId = CspBenchmarkRuleMetadata['benchmark']['id'];
export type BenchmarkName = CspBenchmarkRuleMetadata['benchmark']['name'];
export type RuleSection = CspBenchmarkRuleMetadata['section'];

// Fleet Integration types
export type PostureInput = (typeof SUPPORTED_CLOUDBEAT_INPUTS)[number];
export type CloudSecurityPolicyTemplate = (typeof SUPPORTED_POLICY_TEMPLATES)[number];
export type PosturePolicyTemplate = Extract<CloudSecurityPolicyTemplate, 'kspm' | 'cspm'>;

export type GetComplianceDashboardRequest = TypeOf<typeof getComplianceDashboardSchema>;

// CNVM DASHBOARD

interface AccountVulnStats {
  cloudAccountId: string;
  cloudAccountName: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface VulnStatsTrend {
  '@timestamp': string;
  policy_template: 'vuln_mgmt';
  critical: number;
  high: number;
  medium: number;
  low: number;
  vulnerabilities_stats_by_cloud_account?: Record<
    AccountVulnStats['cloudAccountId'],
    AccountVulnStats
  >;
}

export interface CnvmStatistics {
  criticalCount: number | undefined;
  highCount: number | undefined;
  mediumCount: number | undefined;
  resourcesScanned: number | undefined;
  cloudAccounts: number | undefined;
}

export interface CnvmDashboardData {
  cnvmStatistics: CnvmStatistics;
  vulnTrends: VulnStatsTrend[];
  topVulnerableResources: VulnerableResourceStat[];
  topPatchableVulnerabilities: PatchableVulnerabilityStat[];
  topVulnerabilities: VulnerabilityStat[];
}

export interface VulnerableResourceStat {
  vulnerabilityCount: number | undefined;
  resource: {
    id: string | undefined;
    name: string | undefined;
  };
  cloudRegion: string | undefined;
}

export interface PatchableVulnerabilityStat {
  vulnerabilityCount: number | undefined;
  packageFixVersion: string | undefined;
  cve: string | undefined;
  cvss: {
    score: number | undefined;
    version: string | undefined;
  };
}

export interface VulnerabilityStat {
  packageFixVersion: string | undefined;
  packageName: string | undefined;
  packageVersion: string | undefined;
  severity: string | undefined;
  vulnerabilityCount: number | undefined;
  cvss: {
    score: number | undefined;
    version: string | undefined;
  };
  cve: string | undefined;
}

export interface AggFieldBucket {
  doc_count_error_upper_bound: number;
  sum_other_doc_count: number;
  buckets: Array<{
    key?: string;
    doc_count?: string;
  }>;
}
