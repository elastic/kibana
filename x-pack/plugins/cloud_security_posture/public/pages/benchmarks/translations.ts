/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const BENCHMARK_INTEGRATIONS = i18n.translate(
  'xpack.csp.benchmarks.benchmarkIntegrationsTitle',
  {
    defaultMessage: 'Benchmark Integrations',
  }
);

export const TABLE_COLUMN_HEADERS = {
  INTEGRATION: i18n.translate('xpack.csp.benchmarks.benchmarksTable.integrationColumnTitle', {
    defaultMessage: 'Integration',
  }),
  INTEGRATION_TYPE: i18n.translate(
    'xpack.csp.benchmarks.benchmarksTable.integrationTypeColumnTitle',
    {
      defaultMessage: 'Integration Type',
    }
  ),
  ACTIVE_RULES: i18n.translate('xpack.csp.benchmarks.benchmarksTable.activeRulesColumnTitle', {
    defaultMessage: 'Active Rules',
  }),
  AGENT_POLICY: i18n.translate('xpack.csp.benchmarks.benchmarksTable.agentPolicyColumnTitle', {
    defaultMessage: 'Agent Policy',
  }),
  NUMBER_OF_AGENTS: i18n.translate(
    'xpack.csp.benchmarks.benchmarksTable.numberOfAgentsColumnTitle',
    {
      defaultMessage: 'Number of Agents',
    }
  ),
  CREATED_BY: i18n.translate('xpack.csp.benchmarks.benchmarksTable.createdByColumnTitle', {
    defaultMessage: 'Created by',
  }),
  CREATED_AT: i18n.translate('xpack.csp.benchmarks.benchmarksTable.createdAtColumnTitle', {
    defaultMessage: 'Created at',
  }),
};

export const SEARCH_PLACEHOLDER = i18n.translate('xpack.csp.benchmarks.searchPlaceholder', {
  defaultMessage: 'e.g. benchmark name',
});
