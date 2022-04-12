/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const BENCHMARK_INTEGRATIONS = i18n.translate(
  'xpack.csp.benchmarks.benchmark_integrations',
  {
    defaultMessage: 'Benchmark Integrations',
  }
);

export const LOADING_BENCHMARKS = i18n.translate('xpack.csp.benchmarks.loading_benchmarks', {
  defaultMessage: 'Loading your benchmarks...',
});

export const ADD_A_CIS_INTEGRATION = i18n.translate('xpack.csp.benchmarks.add_a_cis_integration', {
  defaultMessage: 'Add a CIS integration',
});

export const TABLE_COLUMN_HEADERS = {
  INTEGRATION: i18n.translate('xpack.csp.benchmarks.table_column_headers.integrationNameLabel', {
    defaultMessage: 'Integration',
  }),
  INTEGRATION_TYPE: i18n.translate(
    'xpack.csp.benchmarks.table_column_headers.integrationTypeLabel',
    { defaultMessage: 'Integration Type' }
  ),
  ACTIVE_RULES: i18n.translate('xpack.csp.benchmarks.table_column_headers.active_rules', {
    defaultMessage: 'Active Rules',
  }),
  AGENT_POLICY: i18n.translate('xpack.csp.benchmarks.table_column_headers.agent_policy', {
    defaultMessage: 'Agent Policy',
  }),
  NUMBER_OF_AGENTS: i18n.translate('xpack.csp.benchmarks.table_column_headers.number_of_agents', {
    defaultMessage: 'Number of Agents',
  }),
  CREATED_BY: i18n.translate('xpack.csp.benchmarks.table_column_headers.created_by', {
    defaultMessage: 'Created by',
  }),
  CREATED_AT: i18n.translate('xpack.csp.benchmarks.table_column_headers.created_at', {
    defaultMessage: 'Created at',
  }),
};

export const SEARCH_PLACEHOLDER = i18n.translate('xpack.csp.benchmarks.searchPlaceholder', {
  defaultMessage: 'e.g. benchmark name',
});
