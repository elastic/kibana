/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregationsMultiBucketBase } from '@elastic/elasticsearch/lib/api/types';
import { CspStatusCode } from '../../../../common/types_old';

export type CloudSecurityUsageCollectorType =
  | 'Indices'
  | 'Accounts'
  | 'Resources'
  | 'Rules'
  | 'Installation'
  | 'Alerts'
  | 'Cloud Accounts'
  | 'Muted Rules';

export type CloudProviderKey = 'cis_eks' | 'cis_gke' | 'cis_k8s' | 'cis_ake';
export type CloudbeatConfigKeyType =
  | 'cloudbeat/cis_aws'
  | 'cloudbeat/vuln_mgmt_aws'
  | 'cloudbeat/cis_gcp'
  | 'cloudbeat/cis_azure';

export interface CspmUsage {
  indices: CspmIndicesStats;
  resources_stats: CspmResourcesStats[];
  accounts_stats: CspmAccountsStats[];
  rules_stats: CspmRulesStats[];
  installation_stats: CloudSecurityInstallationStats[];
  alerts_stats: CloudSecurityAlertsStats[];
  cloud_account_stats: CloudSecurityAccountsStats[];
  muted_rules_stats: MutedRulesStats[];
}

export interface PackageSetupStatus {
  status: CspStatusCode;
  installedPackagePolicies: number;
  healthyAgents: number;
}

export interface CspmIndicesStats {
  findings: IndexStats | {};
  latest_findings: IndexStats | {};
  vulnerabilities: IndexStats | {};
  latest_vulnerabilities: IndexStats | {};
  score: IndexStats | {};
  latestPackageVersion: string;
  cspm: PackageSetupStatus;
  kspm: PackageSetupStatus;
  vuln_mgmt: PackageSetupStatus;
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

export interface CloudSecurityAccountsStats {
  account_id: string;
  product: string;
  cloud_provider: string | null;
  package_policy_id: string | null;
  posture_management_stats?: CloudPostureAccountsStats;
  posture_management_stats_enabled_rules?: CloudPostureAccountsStats;
  kspm_stats?: KSPMAccountsStats;
  latest_doc_count: number;
  latest_doc_updated_timestamp: string;
  has_muted_rules?: boolean;
}
export interface CloudPostureAccountsStats {
  posture_score: number;
  benchmark_name: string;
  benchmark_version: string;
  passed_findings_count: number;
  failed_findings_count: number;
}

export interface KSPMAccountsStats {
  kubernetes_version: string | null;
  agents_count: number;
  nodes_count: number;
  pods_count: number;
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
  kubernetes_version: string | null;
  agents_count: number;
  nodes_count: number;
  pods_count: number;
}
export interface CspmRulesStats {
  account_id: string;
  rule_id: string;
  rule_name: string;
  rule_section: string;
  rule_version: string;
  rule_number: string;
  posture_type: string;
  benchmark_id: string;
  benchmark_name: string;
  benchmark_version: string;
  passed_findings_count: number;
  failed_findings_count: number;
}

export type SetupAccessOption =
  | 'temporary access'
  | 'direct access'
  | 'role'
  | 'credentials file'
  | 'credentials json'
  | null;
export interface CloudSecurityInstallationStats {
  package_policy_id: string;
  feature: string;
  package_version: string;
  agent_policy_id: string;
  deployment_mode: string;
  created_at: string;
  agent_count: number;
  is_setup_automatic: boolean;
  is_agentless: boolean;
  account_type?: 'single-account' | 'organization-account';
  setup_access_option: SetupAccessOption;
}

export interface CloudSecurityAlertsStats {
  posture_type: string;
  rules_count: number;
  alerts_count: number;
  alerts_open_count: number;
  alerts_closed_count: number;
  alerts_acknowledged_count: number;
}

export interface Value {
  value: number;
}
export interface BenchmarkName {
  metrics: { 'rule.benchmark.name': string };
}

export interface BenchmarkVersion {
  metrics: { 'rule.benchmark.version': string };
}

export interface BenchmarkId {
  metrics: { 'rule.benchmark.id': string };
}

export interface CloudProvider {
  metrics: { 'cloud.provider': string };
}

export interface KubernetesVersion {
  metrics: { 'cloudbeat.kubernetes.version': string };
}

export interface LatestDocTimestamp {
  metrics: { '@timestamp': string };
}

export interface AccountsStats {
  accounts: {
    buckets: AccountEntity[];
  };
}
export interface AccountEntity {
  key: string; // account_id
  doc_count: number; // latest findings doc count
  passed_findings_count: AggregationsMultiBucketBase;
  failed_findings_count: AggregationsMultiBucketBase;
  package_policy_id: {
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
    buckets: Array<{
      key: string; // package_policy_id
      doc_count: number;
    }>;
  };
  cloud_provider: { top: CloudProvider[] };
  latest_doc_updated_timestamp: { top: LatestDocTimestamp[] };
  benchmark_id: { top: BenchmarkId[] };
  benchmark_name: { top: BenchmarkName[] };
  benchmark_version: { top: BenchmarkVersion[] };
  kubernetes_version: { top: KubernetesVersion[] };
  agents_count: Value;
  nodes_count: Value;
  pods_count: Value;
  resources: {
    pods_count: Value;
  };
}

export interface MutedRulesStats {
  id: string;
  name: string;
  section: string;
  version: string;
  benchmark_id: string;
  benchmark_name: string;
  benchmark_version: string;
  posture_type: string;
  rule_number: string;
}
