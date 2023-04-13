/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CHART_PANEL_TEST_SUBJECTS = {
  LOADING: 'chart_is_loading',
  EMPTY: 'chart_is_empty',
  ERROR: 'chart_is_error',
  TEST_CHART: 'testing_chart',
};

export const NO_FINDINGS_STATUS_TEST_SUBJ = {
  NO_AGENTS_DEPLOYED: 'status-api-no-agent-deployed',
  INDEXING: 'status-api-indexing',
  INDEX_TIMEOUT: 'status-api-index-timeout',
  UNPRIVILEGED: 'status-api-unprivileged',
  NO_FINDINGS: 'no-findings-found',
};

export const NO_VULNERABILITIES_STATUS_TEST_SUBJ = {
  SCANNING_VULNERABILITIES: 'scanning-vulnerabilities-empty-prompt',
  UNPRIVILEGED: 'status-api-vuln-mgmt-unprivileged',
  INDEX_TIMEOUT: 'status-api-vuln-mgmt-index-timeout',
  NO_VULNERABILITIES: 'no-vulnerabilities-vuln-mgmt-found',
};

export const VULNERABILITIES_CONTAINER_TEST_SUBJ = 'vulnerabilities_container';
