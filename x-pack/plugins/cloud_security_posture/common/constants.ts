/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const STATS_ROUTE_PATH = '/api/csp/stats';
export const FINDINGS_ROUTE_PATH = '/api/csp/findings';
export const BENCHMARKS_ROUTE_PATH = '/api/csp/benchmarks';

export const CSP_KUBEBEAT_INDEX_PATTERN = 'logs-cis_kubernetes_benchmark.findings*';
export const AGENT_LOGS_INDEX_PATTERN = '.logs-cis_kubernetes_benchmark.metadata*';

export const CSP_FINDINGS_INDEX_NAME = 'findings';
export const CIS_KUBERNETES_PACKAGE_NAME = 'cis_kubernetes_benchmark';

export const RULE_PASSED = `passed`;
export const RULE_FAILED = `failed`;

// A mapping of in-development features to their status. These features should be hidden from users but can be easily
// activated via a simple code change in a single location.
export const INTERNAL_FEATURE_FLAGS = {
  showBenchmarks: false,
  showTrendLineMock: false,
  showClusterMetaMock: false,
  showManageRulesMock: false,
  showRisksMock: false,
} as const;
