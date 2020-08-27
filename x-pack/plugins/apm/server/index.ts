/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginInitializerContext } from 'src/core/server';
import { APMOSSConfig } from 'src/plugins/apm_oss/server';
import { APMPlugin } from './plugin';

export const config = {
  exposeToBrowser: {
    serviceMapEnabled: true,
    ui: true,
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
    telemetryCollectionEnabled: schema.boolean({ defaultValue: true }),
    metricsInterval: schema.number({ defaultValue: 30 }),
  }),
};

export type APMXPackConfig = TypeOf<typeof config.schema>;

export function mergeConfigs(
  apmOssConfig: APMOSSConfig,
  apmConfig: APMXPackConfig
) {
  return {
    /* eslint-disable @typescript-eslint/naming-convention */
    'apm_oss.transactionIndices': apmOssConfig.transactionIndices,
    'apm_oss.spanIndices': apmOssConfig.spanIndices,
    'apm_oss.errorIndices': apmOssConfig.errorIndices,
    'apm_oss.metricsIndices': apmOssConfig.metricsIndices,
    'apm_oss.sourcemapIndices': apmOssConfig.sourcemapIndices,
    'apm_oss.onboardingIndices': apmOssConfig.onboardingIndices,
    'apm_oss.indexPattern': apmOssConfig.indexPattern,
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
    'xpack.apm.ui.maxTraceItems': apmConfig.ui.maxTraceItems,
    'xpack.apm.ui.transactionGroupBucketSize':
      apmConfig.ui.transactionGroupBucketSize,
    'xpack.apm.autocreateApmIndexPattern': apmConfig.autocreateApmIndexPattern,
    'xpack.apm.telemetryCollectionEnabled':
      apmConfig.telemetryCollectionEnabled,
    'xpack.apm.metricsInterval': apmConfig.metricsInterval,
  };
}

export type APMConfig = ReturnType<typeof mergeConfigs>;

export const plugin = (initContext: PluginInitializerContext) =>
  new APMPlugin(initContext);

export { APMPlugin, APMPluginSetup } from './plugin';
