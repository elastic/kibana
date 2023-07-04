/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CloudDefendStatusCode } from '../../../../common';

export interface CloudDefendUsage {
  indices: CloudDefendIndicesStats;
  pods_stats: CloudDefendPodsStats[];
  accounts_stats: CloudDefendAccountsStats[];
  installation_stats: CloudDefendInstallationStats[];
}

export interface PackageSetupStatus {
  status: CloudDefendStatusCode;
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
  container_image_name: string;
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

export interface CloudDefendInstallationStats {
  package_policy_id: string;
  policy_yaml: string;
  policy_json: string;
  package_version: string;
  agent_policy_id: string;
  created_at: string;
  agent_count: number;
}
