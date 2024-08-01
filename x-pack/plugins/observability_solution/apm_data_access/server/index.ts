/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';

const configSchema = schema.object({
  indices: schema.object({
    transaction: schema.string({ defaultValue: 'traces-apm*,apm-*' }), // TODO: remove apm-* pattern in 9.0
    span: schema.string({ defaultValue: 'traces-apm*,apm-*' }),
    error: schema.string({ defaultValue: 'logs-apm*,apm-*' }),
    metric: schema.string({ defaultValue: 'metrics-apm*,apm-*' }),
    onboarding: schema.string({ defaultValue: 'apm-*' }), // Unused: to be deleted
    sourcemap: schema.string({ defaultValue: 'apm-*' }), // Unused: to be deleted
  }),
});

// plugin config
export const config: PluginConfigDescriptor<APMDataAccessConfig> = {
  deprecations: ({ renameFromRoot, unused, deprecate }) => [
    // deprecations
    deprecate('indices.sourcemap', 'a future version', {
      level: 'warning',
      message: `Configuring "xpack.apm.indices.sourcemap" is deprecated and will be removed in a future version. Please remove this setting.`,
    }),

    deprecate('indices.onboarding', 'a future version', {
      level: 'warning',
      message: `Configuring "xpack.apm.indices.onboarding" is deprecated and will be removed in a future version. Please remove this setting.`,
    }),

    // deprecations due to removal of apm_oss plugin
    renameFromRoot('apm_oss.transactionIndices', 'xpack.apm.indices.transaction', {
      level: 'warning',
    }),
    renameFromRoot('apm_oss.spanIndices', 'xpack.apm.indices.span', {
      level: 'warning',
    }),
    renameFromRoot('apm_oss.errorIndices', 'xpack.apm.indices.error', {
      level: 'warning',
    }),
    renameFromRoot('apm_oss.metricsIndices', 'xpack.apm.indices.metric', {
      level: 'warning',
    }),
    renameFromRoot('apm_oss.onboardingIndices', 'xpack.apm.indices.onboarding', {
      level: 'warning',
    }),

    // rename from apm to apm_data_access plugin
    renameFromRoot('xpack.apm.indices.transaction', 'xpack.apm_data_access.indices.transaction', {
      level: 'warning',
      silent: true,
    }),
    renameFromRoot('xpack.apm.indices.span', 'xpack.apm_data_access.indices.span', {
      level: 'warning',
    }),
    renameFromRoot('xpack.apm.indices.error', 'xpack.apm_data_access.indices.error', {
      level: 'warning',
    }),
    renameFromRoot('xpack.apm.indices.metric', 'xpack.apm_data_access.indices.metric', {
      level: 'warning',
    }),
    renameFromRoot('xpack.apm.indices.sourcemap', 'xpack.apm_data_access.indices.sourcemap', {
      level: 'warning',
    }),
    renameFromRoot('xpack.apm.indices.onboarding', 'xpack.apm_data_access.indices.onboarding', {
      level: 'warning',
    }),
  ],

  schema: configSchema,
};
export type APMDataAccessConfig = TypeOf<typeof configSchema>;
export type APMIndices = APMDataAccessConfig['indices'];

export async function plugin(initializerContext: PluginInitializerContext) {
  const { ApmDataAccessPlugin } = await import('./plugin');
  return new ApmDataAccessPlugin(initializerContext);
}

export type {
  ApmDataAccessPluginSetup,
  ApmDataAccessPluginStart,
  ApmDataAccessServices,
  ApmDataAccessServicesParams,
  APMEventClientConfig,
  APMEventESSearchRequest,
  APMLogEventESSearchRequest,
  DocumentSourcesRequest,
} from './types';

export { APMEventClient } from './lib/helpers';
