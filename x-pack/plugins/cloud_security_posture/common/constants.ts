/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const STATUS_ROUTE_PATH = '/internal/cloud_security_posture/status';
export const STATS_ROUTE_PATH = '/internal/cloud_security_posture/stats';
export const BENCHMARKS_ROUTE_PATH = '/internal/cloud_security_posture/benchmarks';
export const UPDATE_RULES_CONFIG_ROUTE_PATH =
  '/internal/cloud_security_posture/update_rules_config';
export const ES_PIT_ROUTE_PATH = '/internal/cloud_security_posture/es_pit';

export const CLOUD_SECURITY_POSTURE_PACKAGE_NAME = 'cloud_security_posture';

export const CSP_LATEST_FINDINGS_DATA_VIEW = 'logs-cloud_security_posture.findings_latest-*';

export const FINDINGS_INDEX_NAME = 'logs-cloud_security_posture.findings';
export const FINDINGS_INDEX_PATTERN = 'logs-cloud_security_posture.findings-default*';

export const LATEST_FINDINGS_INDEX_TEMPLATE_NAME = 'logs-cloud_security_posture.findings_latest';
export const LATEST_FINDINGS_INDEX_PATTERN = 'logs-cloud_security_posture.findings_latest-*';
export const LATEST_FINDINGS_INDEX_DEFAULT_NS =
  'logs-cloud_security_posture.findings_latest-default';

export const BENCHMARK_SCORE_INDEX_TEMPLATE_NAME = 'logs-cloud_security_posture.scores';
export const BENCHMARK_SCORE_INDEX_PATTERN = 'logs-cloud_security_posture.scores-*';
export const BENCHMARK_SCORE_INDEX_DEFAULT_NS = 'logs-cloud_security_posture.scores-default';

export const CSP_INGEST_TIMESTAMP_PIPELINE = 'cloud_security_posture_add_ingest_timestamp_pipeline';

export const RULE_PASSED = `passed`;
export const RULE_FAILED = `failed`;

// A mapping of in-development features to their status. These features should be hidden from users but can be easily
// activated via a simple code change in a single location.
export const INTERNAL_FEATURE_FLAGS = {
  showManageRulesMock: false,
  showFindingsGroupBy: true,
} as const;

export const CSP_RULE_SAVED_OBJECT_TYPE = 'csp_rule';
export const CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE = 'csp-rule-template';

export const CLOUDBEAT_VANILLA = 'cloudbeat/cis_k8s'; // Integration input
export const CLOUDBEAT_EKS = 'cloudbeat/cis_eks'; // Integration input
