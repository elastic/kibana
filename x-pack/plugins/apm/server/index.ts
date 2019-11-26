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
    serviceMapEnabled: schema.boolean({ defaultValue: false }),
    serviceMapIndexPattern: schema.string({ defaultValue: 'apm-*' }),
    serviceMapDestinationIndex: schema.maybe(schema.string()),
    serviceMapDestinationPipeline: schema.maybe(schema.string()),
    autocreateApmIndexPattern: schema.boolean({ defaultValue: true }),
    ui: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
      transactionGroupBucketSize: schema.number({ defaultValue: 100 }),
      maxTraceItems: schema.number({ defaultValue: 1000 }),
    }),
  }),
};

export type APMXPackConfig = TypeOf<typeof config.schema>;

export function mergeConfigs(apmOssConfig: APMOSSConfig, apmConfig: APMXPackConfig) {
  return {
    'apm_oss.transactionIndices': apmOssConfig.transactionIndices,
    'apm_oss.spanIndices': apmOssConfig.spanIndices,
    'apm_oss.errorIndices': apmOssConfig.errorIndices,
    'apm_oss.metricsIndices': apmOssConfig.metricsIndices,
    'apm_oss.sourcemapIndices': apmOssConfig.sourcemapIndices,
    'apm_oss.onboardingIndices': apmOssConfig.onboardingIndices,
    'apm_oss.indexPattern': apmOssConfig.indexPattern,
    'xpack.apm.serviceMapEnabled': apmConfig.serviceMapEnabled,
    'xpack.apm.ui.enabled': apmConfig.ui.enabled,
    'xpack.apm.ui.maxTraceItems': apmConfig.ui.maxTraceItems,
    'xpack.apm.ui.transactionGroupBucketSize': apmConfig.ui.transactionGroupBucketSize,
    'xpack.apm.autocreateApmIndexPattern': apmConfig.autocreateApmIndexPattern,
    'xpack.apm.serviceMapIndexPattern': apmConfig.serviceMapIndexPattern,
    'xpack.apm.serviceMapDestinationIndex': apmConfig.serviceMapDestinationIndex,
    'xpack.apm.serviceMapDestinationPipeline': apmConfig.serviceMapDestinationPipeline,
  };
}

export type APMConfig = ReturnType<typeof mergeConfigs>;

export const plugin = (initContext: PluginInitializerContext) => new APMPlugin(initContext);

export { APMPlugin, APMPluginContract } from './plugin';
