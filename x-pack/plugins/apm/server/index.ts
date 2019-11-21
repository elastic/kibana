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
  schema: schema.object({
    servicemapEnabled: schema.boolean({ defaultValue: false }),
    autocreateApmIndexPattern: schema.boolean({ defaultValue: true }),
    'ui.transactionGroupBucketSize': schema.number({ defaultValue: 100 }),
    'ui.maxTraceItems': schema.number({ defaultValue: 1000 }),
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
    'xpack.apm.servicemapEnabled': apmConfig.servicemapEnabled,
    'xpack.apm.ui.maxTraceItems': apmConfig['ui.maxTraceItems'],
    'xpack.apm.ui.transactionGroupBucketSize': apmConfig['ui.transactionGroupBucketSize'],
    'xpack.apm.autocreateApmIndexPattern': apmConfig.autocreateApmIndexPattern,
  };
}

export type APMConfig = ReturnType<typeof mergeConfigs>;

export const plugin = (initContext: PluginInitializerContext) => new APMPlugin(initContext);

export { APMPlugin } from './plugin';
