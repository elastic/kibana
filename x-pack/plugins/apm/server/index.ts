/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import {
  PluginInitializerContext,
  PluginConfigDescriptor,
} from 'src/core/server';
import { APMPlugin } from './plugin';
import { SearchAggregatedTransactionSetting } from '../common/aggregated_transactions';

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
  maxServiceEnvironments: schema.number({ defaultValue: 100 }),
  maxServiceSelection: schema.number({ defaultValue: 50 }),
  profilingEnabled: schema.boolean({ defaultValue: false }),
  agent: schema.object({
    migrations: schema.object({
      enabled: schema.boolean({ defaultValue: false }),
    }),
  }),
  transactionIndices: schema.string({
    defaultValue: 'traces-apm*,apm-*-transaction-*',
  }),
  spanIndices: schema.string({ defaultValue: 'traces-apm*,apm-*-span-*' }),
  errorIndices: schema.string({ defaultValue: 'logs-apm*,apm-*-error-*' }),
  metricsIndices: schema.string({
    defaultValue: 'metrics-apm*,apm-*-metric-*',
  }),
  sourcemapIndices: schema.string({ defaultValue: 'apm-*-sourcemap-*' }),
  onboardingIndices: schema.string({ defaultValue: 'apm-*-onboarding-*' }),
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
    /* eslint-disable @typescript-eslint/naming-convention */
    'xpack.apm.transactionIndices': apmConfig.transactionIndices,
    'xpack.apm.spanIndices': apmConfig.spanIndices,
    'xpack.apm.errorIndices': apmConfig.errorIndices,
    'xpack.apm.metricsIndices': apmConfig.metricsIndices,
    'xpack.apm.sourcemapIndices': apmConfig.sourcemapIndices,
    'xpack.apm.onboardingIndices': apmConfig.onboardingIndices,
    // TODO: Remove all apm_oss options by 8.0
    'apm_oss.transactionIndices': apmConfig.transactionIndices,
    'apm_oss.spanIndices': apmConfig.spanIndices,
    'apm_oss.errorIndices': apmConfig.errorIndices,
    'apm_oss.metricsIndices': apmConfig.metricsIndices,
    'apm_oss.sourcemapIndices': apmConfig.sourcemapIndices,
    'apm_oss.onboardingIndices': apmConfig.onboardingIndices,
    /* eslint-enable @typescript-eslint/naming-convention */
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
    'xpack.apm.maxServiceEnvironments': apmConfig.maxServiceEnvironments,
    'xpack.apm.maxServiceSelection': apmConfig.maxServiceSelection,
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

  // TODO make these default
  // mergedConfig['apm_oss.transactionIndices'] = `traces-apm*,${mergedConfig['apm_oss.transactionIndices']}`;
  // mergedConfig['apm_oss.spanIndices'] = `traces-apm*,${mergedConfig['apm_oss.spanIndices']}`;
  // mergedConfig['apm_oss.errorIndices'] = `logs-apm*,${mergedConfig['apm_oss.errorIndices']}`;
  // mergedConfig['apm_oss.metricsIndices'] = `metrics-apm*,${mergedConfig['apm_oss.metricsIndices']}`;

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
