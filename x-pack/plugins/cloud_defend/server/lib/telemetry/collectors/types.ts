/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SelectorType, SelectorCondition, ResponseAction } from '../../../../common';

export interface CloudDefendUsage {
  indices: CloudDefendIndicesStats;
  pods_stats: CloudDefendPodsStats[];
  accounts_stats: CloudDefendAccountsStats[];
  installation_stats: CloudDefendInstallationStats[];
}

export interface PackageSetupStatus {
  status: string;
  installedPackagePolicies: number;
  healthyAgents: number;
}

export interface CloudDefendIndicesStats {
  alerts: IndexStats | {};
  file: IndexStats | {};
  process: IndexStats | {};
  latestPackageVersion: string;
  packageStatus: PackageSetupStatus;
}

export interface IndexStats {
  doc_count: number;
  deleted: number;
  size_in_bytes: number;
  last_doc_timestamp: string | null;
}

export interface CloudDefendPodsStats {
  account_id: string;
  pod_name: string;
  container_image_name: string;
  container_image_tag: string;
  cloud_provider: string;
  file_doc_count: number;
  process_doc_count: number;
  alert_doc_count: number;
}

export interface CloudDefendAccountsStats {
  account_id: string;
  total_doc_count: number;
  kubernetes_version: string | null;
  file_doc_count: number;
  process_doc_count: number;
  alert_doc_count: number;
  agents_count: number;
  nodes_count: number;
  pods_count: number;
}

export type CloudDefendSelectorTypeCounts = {
  [key in SelectorType]?: number;
};

export type CloudDefendResponseTypeCounts = {
  [key in SelectorType]?: number;
};

export type CloudDefendConditionsCounts = {
  [key in SelectorCondition]?: number;
};

export type CloudDefendActionCounts = {
  [key in ResponseAction]?: number;
};

export interface CloudDefendPolicyYamlStats {
  policy_yaml: string;
  policy_json: string; // to be used for further digging in BigQuery
  selector_counts: CloudDefendSelectorTypeCounts;
  response_counts: CloudDefendResponseTypeCounts;
  conditions_in_use: CloudDefendConditionsCounts;
  actions_in_use: CloudDefendActionCounts;
}

export interface CloudDefendInstallationStats {
  package_policy_id: string;
  package_version: string;
  agent_policy_id: string;
  created_at: string;
  agent_count: number;
  policy_yaml_stats: CloudDefendPolicyYamlStats;
}
