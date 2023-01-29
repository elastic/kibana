/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const STATUS_ROUTE_PATH = '/internal/cloud_security_posture/status';
export const STATS_ROUTE_PATH = '/internal/cloud_security_posture/stats/{policy_template}';
export const BENCHMARKS_ROUTE_PATH = '/internal/cloud_security_posture/benchmarks';

export const CLOUD_SECURITY_POSTURE_PACKAGE_NAME = 'cloud_security_posture';

export const CSP_LATEST_FINDINGS_DATA_VIEW = 'logs-cloud_security_posture.findings_latest-*';
export const CSP_FINDINGS_DATA_VIEW = 'logs-cloud_security_posture.findings-*';

export const FINDINGS_INDEX_NAME = 'logs-cloud_security_posture.findings';
export const FINDINGS_INDEX_PATTERN = 'logs-cloud_security_posture.findings-default*';
export const FINDINGS_INDEX_DEFAULT_NS = 'logs-cloud_security_posture.findings-default';

export const LATEST_FINDINGS_INDEX_TEMPLATE_NAME = 'logs-cloud_security_posture.findings_latest';
export const LATEST_FINDINGS_INDEX_PATTERN = 'logs-cloud_security_posture.findings_latest-*';
export const LATEST_FINDINGS_INDEX_DEFAULT_NS =
  'logs-cloud_security_posture.findings_latest-default';

export const BENCHMARK_SCORE_INDEX_TEMPLATE_NAME = 'logs-cloud_security_posture.scores';
export const BENCHMARK_SCORE_INDEX_PATTERN = 'logs-cloud_security_posture.scores-*';
export const BENCHMARK_SCORE_INDEX_DEFAULT_NS = 'logs-cloud_security_posture.scores-default';

export const CSP_INGEST_TIMESTAMP_PIPELINE = 'cloud_security_posture_add_ingest_timestamp_pipeline';
export const CSP_LATEST_FINDINGS_INGEST_TIMESTAMP_PIPELINE =
  'cloud_security_posture_latest_index_add_ingest_timestamp_pipeline';

export const RULE_PASSED = `passed`;
export const RULE_FAILED = `failed`;

// A mapping of in-development features to their status. These features should be hidden from users but can be easily
// activated via a simple code change in a single location.
export const INTERNAL_FEATURE_FLAGS = {
  showManageRulesMock: false,
  showFindingFlyoutEvidence: false,
  showFindingsGroupBy: true,
} as const;

export const CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE = 'csp-rule-template';

export const CLOUDBEAT_VANILLA = 'cloudbeat/cis_k8s'; // Integration input
export const CLOUDBEAT_EKS = 'cloudbeat/cis_eks'; // Integration input
export const CLOUDBEAT_AWS = 'cloudbeat/cis_aws'; // Integration input
export const CLOUDBEAT_GCP = 'cloudbeat/cis_gcp'; // Integration input
export const CLOUDBEAT_AZURE = 'cloudbeat/cis_azure'; // Integration input
export const KSPM_POLICY_TEMPLATE = 'kspm';
export const CSPM_POLICY_TEMPLATE = 'cspm';
export const SUPPORTED_POLICY_TEMPLATES = [KSPM_POLICY_TEMPLATE, CSPM_POLICY_TEMPLATE] as const;
export const SUPPORTED_CLOUDBEAT_INPUTS = [
  CLOUDBEAT_VANILLA,
  CLOUDBEAT_EKS,
  CLOUDBEAT_AWS,
  CLOUDBEAT_GCP,
  CLOUDBEAT_AZURE,
] as const;
