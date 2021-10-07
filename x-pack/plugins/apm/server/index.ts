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
} from 'src/core/server';
import { maxSuggestions } from '../../observability/common';
import { SearchAggregatedTransactionSetting } from '../common/aggregated_transactions';
import { APMPlugin } from './plugin';

const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  serviceMapEnabled: schema.boolean({ defaultValue: true }),
  serviceMapFingerprintBucketSize: schema.number({ defaultValue: 100 }),
  serviceMapTraceIdBucketSize: schema.number({ defaultValue: 65 }),
  serviceMapFingerprintGlobalBucketSize: schema.number({
    defaultValue: 1000,
  }),
  serviceMapTraceIdGlobalBucketSize: schema.number({ defaultValue: 6 }),
  serviceMapMaxTracesPerRequest: schema.number({ defaultValue: 50 }),
  autocreateApmIndexPattern: schema.boolean({ defaultValue: true }),
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
  transactionIndices: schema.string({ defaultValue: 'traces-apm*,apm-*' }),
  spanIndices: schema.string({ defaultValue: 'traces-apm*,apm-*' }),
  errorIndices: schema.string({ defaultValue: 'logs-apm*,apm-*' }),
  metricsIndices: schema.string({ defaultValue: 'metrics-apm*,apm-*' }),
  sourcemapIndices: schema.string({ defaultValue: 'apm-*' }),
  onboardingIndices: schema.string({ defaultValue: 'apm-*' }),
  indexPattern: schema.string({ defaultValue: 'apm-*' }),
  fleetMode: schema.boolean({ defaultValue: true }),
});

// plugin config
export const config: PluginConfigDescriptor<APMXPackConfig> = {
  deprecations: ({
    deprecate,
    renameFromRoot,
    deprecateFromRoot,
    unusedFromRoot,
  }) => [
    deprecate('enabled', '8.0.0'),
    renameFromRoot(
      'apm_oss.transactionIndices',
      'xpack.apm.transactionIndices'
    ),
    renameFromRoot('apm_oss.spanIndices', 'xpack.apm.spanIndices'),
    renameFromRoot('apm_oss.errorIndices', 'xpack.apm.errorIndices'),
    renameFromRoot('apm_oss.metricsIndices', 'xpack.apm.metricsIndices'),
    renameFromRoot('apm_oss.sourcemapIndices', 'xpack.apm.sourcemapIndices'),
    renameFromRoot('apm_oss.onboardingIndices', 'xpack.apm.onboardingIndices'),
    renameFromRoot('apm_oss.indexPattern', 'xpack.apm.indexPattern'),
    renameFromRoot('apm_oss.fleetMode', 'xpack.apm.fleetMode'),
    deprecateFromRoot('apm_oss.enabled', '8.0.0'),
    unusedFromRoot('apm_oss.fleetMode'),
    unusedFromRoot('apm_oss.indexPattern'),
    renameFromRoot(
      'xpack.apm.maxServiceEnvironments',
      `uiSettings.overrides[${maxSuggestions}]`
    ),
    renameFromRoot(
      'xpack.apm.maxServiceSelections',
      `uiSettings.overrides[${maxSuggestions}]`
    ),
  ],
  exposeToBrowser: {
    serviceMapEnabled: true,
    ui: true,
    profilingEnabled: true,
  },
  schema: configSchema,
};

export type APMXPackConfig = TypeOf<typeof configSchema>;
export type APMConfig = ReturnType<typeof mergeConfigs>;

// plugin config and ui indices settings
export function mergeConfigs(apmConfig: APMXPackConfig) {
  const mergedConfig = {
    'xpack.apm.transactionIndices': apmConfig.transactionIndices,
    'xpack.apm.spanIndices': apmConfig.spanIndices,
    'xpack.apm.errorIndices': apmConfig.errorIndices,
    'xpack.apm.metricsIndices': apmConfig.metricsIndices,
    'xpack.apm.sourcemapIndices': apmConfig.sourcemapIndices,
    'xpack.apm.onboardingIndices': apmConfig.onboardingIndices,
    'xpack.apm.serviceMapEnabled': apmConfig.serviceMapEnabled,
    'xpack.apm.serviceMapFingerprintBucketSize':
      apmConfig.serviceMapFingerprintBucketSize,
    'xpack.apm.serviceMapTraceIdBucketSize':
      apmConfig.serviceMapTraceIdBucketSize,
    'xpack.apm.serviceMapFingerprintGlobalBucketSize':
      apmConfig.serviceMapFingerprintGlobalBucketSize,
    'xpack.apm.serviceMapTraceIdGlobalBucketSize':
      apmConfig.serviceMapTraceIdGlobalBucketSize,
    'xpack.apm.serviceMapMaxTracesPerRequest':
      apmConfig.serviceMapMaxTracesPerRequest,
    'xpack.apm.ui.enabled': apmConfig.ui.enabled,
    'xpack.apm.ui.maxTraceItems': apmConfig.ui.maxTraceItems,
    'xpack.apm.ui.transactionGroupBucketSize':
      apmConfig.ui.transactionGroupBucketSize,
    'xpack.apm.autocreateApmIndexPattern': apmConfig.autocreateApmIndexPattern,
    'xpack.apm.telemetryCollectionEnabled':
      apmConfig.telemetryCollectionEnabled,
    'xpack.apm.searchAggregatedTransactions':
      apmConfig.searchAggregatedTransactions,
    'xpack.apm.metricsInterval': apmConfig.metricsInterval,
    'xpack.apm.agent.migrations.enabled': apmConfig.agent.migrations.enabled,
  };

  return mergedConfig;
}

export const plugin = (initContext: PluginInitializerContext) =>
  new APMPlugin(initContext);

export { APM_SERVER_FEATURE_ID } from '../common/alert_types';
export { APMPlugin } from './plugin';
export { APMPluginSetup } from './types';
export {
  APMServerRouteRepository,
  APIEndpoint,
} from './routes/get_global_apm_server_route_repository';
export { APMRouteHandlerResources } from './routes/typings';

export type { ProcessorEvent } from '../common/processor_event';
