/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import {
  PluginConfigDescriptor,
  PluginInitializerContext,
} from '@kbn/core/server';
import { maxSuggestions } from '@kbn/observability-plugin/common';
import { SearchAggregatedTransactionSetting } from '../common/aggregated_transactions';
import { APMPlugin } from './plugin';

// All options should be documented in the APM configuration settings: https://github.com/elastic/kibana/blob/main/docs/settings/apm-settings.asciidoc
// and be included on cloud allow list unless there are specific reasons not to
const configSchema = schema.object({
  autoCreateApmDataView: schema.boolean({ defaultValue: true }),
  serviceMapEnabled: schema.boolean({ defaultValue: true }),
  serviceMapFingerprintBucketSize: schema.number({ defaultValue: 100 }),
  serviceMapTraceIdBucketSize: schema.number({ defaultValue: 65 }),
  serviceMapFingerprintGlobalBucketSize: schema.number({
    defaultValue: 1000,
  }),
  serviceMapTraceIdGlobalBucketSize: schema.number({ defaultValue: 6 }),
  serviceMapMaxTracesPerRequest: schema.number({ defaultValue: 50 }),
  ui: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    transactionGroupBucketSize: schema.number({ defaultValue: 1000 }),
    maxTraceItems: schema.number({ defaultValue: 1000 }),
  }),
  searchAggregatedTransactions: schema.oneOf(
    [
      schema.literal(SearchAggregatedTransactionSetting.auto),
      schema.literal(SearchAggregatedTransactionSetting.always),
      schema.literal(SearchAggregatedTransactionSetting.never),
    ],
    { defaultValue: SearchAggregatedTransactionSetting.auto }
  ),
  telemetryCollectionEnabled: schema.boolean({ defaultValue: true }),
  metricsInterval: schema.number({ defaultValue: 30 }),
  profilingEnabled: schema.boolean({ defaultValue: false }),
  agent: schema.object({
    migrations: schema.object({
      enabled: schema.boolean({ defaultValue: false }),
    }),
  }),
  indices: schema.object({
    transaction: schema.string({ defaultValue: 'traces-apm*,apm-*' }),
    span: schema.string({ defaultValue: 'traces-apm*,apm-*' }),
    error: schema.string({ defaultValue: 'logs-apm*,apm-*' }),
    metric: schema.string({ defaultValue: 'metrics-apm*,apm-*' }),
    sourcemap: schema.string({ defaultValue: 'apm-*' }),
    onboarding: schema.string({ defaultValue: 'apm-*' }),
  }),
});

// plugin config
export const config: PluginConfigDescriptor<APMConfig> = {
  deprecations: ({
    rename,
    renameFromRoot,
    deprecateFromRoot,
    unusedFromRoot,
  }) => [
    rename('autocreateApmIndexPattern', 'autoCreateApmDataView', {
      level: 'warning',
    }),
    renameFromRoot(
      'apm_oss.transactionIndices',
      'xpack.apm.indices.transaction',
      { level: 'warning' }
    ),
    renameFromRoot('apm_oss.spanIndices', 'xpack.apm.indices.span', {
      level: 'warning',
    }),
    renameFromRoot('apm_oss.errorIndices', 'xpack.apm.indices.error', {
      level: 'warning',
    }),
    renameFromRoot('apm_oss.metricsIndices', 'xpack.apm.indices.metric', {
      level: 'warning',
    }),
    renameFromRoot('apm_oss.sourcemapIndices', 'xpack.apm.indices.sourcemap', {
      level: 'warning',
    }),
    renameFromRoot(
      'apm_oss.onboardingIndices',
      'xpack.apm.indices.onboarding',
      { level: 'warning' }
    ),
    deprecateFromRoot('apm_oss.enabled', '8.0.0', { level: 'warning' }),
    unusedFromRoot('apm_oss.fleetMode', { level: 'warning' }),
    unusedFromRoot('apm_oss.indexPattern', { level: 'warning' }),
    renameFromRoot(
      'xpack.apm.maxServiceEnvironments',
      `uiSettings.overrides[${maxSuggestions}]`,
      { level: 'warning' }
    ),
    renameFromRoot(
      'xpack.apm.maxServiceSelections',
      `uiSettings.overrides[${maxSuggestions}]`,
      { level: 'warning' }
    ),
  ],
  exposeToBrowser: {
    serviceMapEnabled: true,
    ui: true,
    profilingEnabled: true,
  },
  schema: configSchema,
};

export type APMConfig = TypeOf<typeof configSchema>;
export type ApmIndicesConfigName = keyof APMConfig['indices'];

export const plugin = (initContext: PluginInitializerContext) =>
  new APMPlugin(initContext);

export { APM_SERVER_FEATURE_ID } from '../common/alert_types';
export { APMPlugin } from './plugin';
export type { APMPluginSetup } from './types';
export type {
  APMServerRouteRepository,
  APIEndpoint,
} from './routes/apm_routes/get_global_apm_server_route_repository';
export type { APMRouteHandlerResources } from './routes/typings';

export type { ProcessorEvent } from '../common/processor_event';
