/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const STATS_ROUTE_PATH = '/internal/cloud_security_posture/stats';
export const FINDINGS_ROUTE_PATH = '/internal/cloud_security_posture/findings';
export const BENCHMARKS_ROUTE_PATH = '/internal/cloud_security_posture/benchmarks';
export const UPDATE_RULES_CONFIG_ROUTE_PATH =
  '/internal/cloud_security_posture/update_rules_config';

export const CSP_FINDINGS_INDEX_NAME = 'findings';
export const CIS_KUBERNETES_PACKAGE_NAME = 'cis_kubernetes_benchmark';
export const FINDINGS_DATA_STREAM_NAME =
  // Currently 'cis_kubernetes_benchmark.findings', To be refactored to 'cloud_security_posture.findings'
  CIS_KUBERNETES_PACKAGE_NAME + '.' + CSP_FINDINGS_INDEX_NAME;
export const LATEST_FINDINGS_INDEX_NAME = 'cloud_security_posture.findings_latest';
export const BENCHMARK_SCORE_INDEX_NAME = 'cloud_security_posture.scores';

export const AGENT_LOGS_INDEX_PATTERN = '.logs-cis_kubernetes_benchmark.metadata*';
export const CSP_KUBEBEAT_INDEX_PATTERN = 'logs-cis_kubernetes_benchmark.findings-*';
export const FINDINGS_INDEX_PATTERN = 'logs-' + FINDINGS_DATA_STREAM_NAME + '-default*';
export const LATEST_FINDINGS_INDEX_PATTERN = 'logs-' + LATEST_FINDINGS_INDEX_NAME + '-default';
export const BENCHMARK_SCORE_INDEX_PATTERN = 'logs-' + BENCHMARK_SCORE_INDEX_NAME + '-default';

export const RULE_PASSED = `passed`;
export const RULE_FAILED = `failed`;

// A mapping of in-development features to their status. These features should be hidden from users but can be easily
// activated via a simple code change in a single location.
export const INTERNAL_FEATURE_FLAGS = {
  showBenchmarks: false,
  showManageRulesMock: false,
  showRisksMock: false,
  showFindingsGroupBy: false,
} as const;
