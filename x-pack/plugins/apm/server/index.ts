/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginInitializerContext } from 'src/core/server';
import { APMOSSConfig } from 'src/plugins/apm_oss/server';
import { APMPlugin } from './plugin';
import { SearchAggregatedTransactionSetting } from '../common/aggregated_transactions';

// plugin config
export const config = {
  exposeToBrowser: {
    serviceMapEnabled: true,
    ui: true,
    profilingEnabled: true,
  },
  schema: schema.object({
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
      {
        defaultValue: SearchAggregatedTransactionSetting.never,
      }
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
  }),
};

export type APMXPackConfig = TypeOf<typeof config.schema>;
export type APMConfig = ReturnType<typeof mergeConfigs>;

// plugin config and ui indices settings
export function mergeConfigs(
  apmOssConfig: APMOSSConfig,
  apmConfig: APMXPackConfig
) {
  const mergedConfig = {
    /* eslint-disable @typescript-eslint/naming-convention */
    // TODO: Remove all apm_oss options by 8.0
    'apm_oss.transactionIndices': apmOssConfig.transactionIndices,
    'apm_oss.spanIndices': apmOssConfig.spanIndices,
    'apm_oss.errorIndices': apmOssConfig.errorIndices,
    'apm_oss.metricsIndices': apmOssConfig.metricsIndices,
    'apm_oss.sourcemapIndices': apmOssConfig.sourcemapIndices,
    'apm_oss.onboardingIndices': apmOssConfig.onboardingIndices,
    'apm_oss.indexPattern': apmOssConfig.indexPattern, // TODO: add data stream indices: traces-apm*,logs-apm*,metrics-apm*. Blocked by https://github.com/elastic/kibana/issues/87851
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

  // Add data stream indices to list of configured values
  mergedConfig[
    'apm_oss.transactionIndices'
  ] = `traces-apm*,${mergedConfig['apm_oss.transactionIndices']}`;

  mergedConfig[
    'apm_oss.spanIndices'
  ] = `traces-apm*,${mergedConfig['apm_oss.spanIndices']}`;

  mergedConfig[
    'apm_oss.errorIndices'
  ] = `logs-apm*,${mergedConfig['apm_oss.errorIndices']}`;

  mergedConfig[
    'apm_oss.metricsIndices'
  ] = `metrics-apm*,${mergedConfig['apm_oss.metricsIndices']}`;

  return mergedConfig;
}

export const plugin = (initContext: PluginInitializerContext) =>
  new APMPlugin(initContext);

export { APM_SERVER_FEATURE_ID } from '../common/alert_types';
export { APMPlugin } from './plugin';
export { APMPluginSetup } from './types';
export { APMServerRouteRepository } from './routes/get_global_apm_server_route_repository';
export { InspectResponse, APMRouteHandlerResources } from './routes/typings';

export type { ProcessorEvent } from '../common/processor_event';
