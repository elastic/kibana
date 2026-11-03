/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import { maxSuggestions } from '@kbn/observability-plugin/common/ui_settings_keys';
import { configSchema } from './config_schema';

// plugin config
export const config: PluginConfigDescriptor<APMConfig> = {
  deprecations: ({ rename, unused, renameFromRoot, deprecateFromRoot, unusedFromRoot }) => [
    unused('ui.transactionGroupBucketSize', {
      level: 'warning',
    }),
    rename('autocreateApmIndexPattern', 'autoCreateApmDataView', {
      level: 'warning',
    }),
    deprecateFromRoot('apm_oss.enabled', '8.0.0', { level: 'warning' }),
    unusedFromRoot('apm_oss.fleetMode', { level: 'warning' }),
    unusedFromRoot('apm_oss.indexPattern', { level: 'warning' }),
    renameFromRoot('xpack.apm.maxServiceEnvironments', `uiSettings.overrides[${maxSuggestions}]`, {
      level: 'warning',
    }),
    renameFromRoot('xpack.apm.maxServiceSelection', `uiSettings.overrides[${maxSuggestions}]`, {
      level: 'warning',
    }),
    unused('forceSyntheticSource', {
      level: 'warning',
    }),
  ],
  exposeToBrowser: {
    serviceMapEnabled: true,
    ui: true,
    latestAgentVersionsUrl: true,
    managedServiceUrl: true,
    serverlessOnboarding: true,
    featureFlags: true,
    serverless: true,
  },
  schema: configSchema,
};

export type APMConfig = TypeOf<typeof configSchema>;

export const plugin = async (initContext: PluginInitializerContext) => {
  const { APMPlugin } = await import('./plugin');
  return new APMPlugin(initContext);
};

export { APM_SERVER_FEATURE_ID } from '../common/rules/apm_rule_types';
export type { APMPluginSetup } from './types';
export type {
  APMServerRouteRepository,
  APIEndpoint,
} from './routes/apm_routes/get_global_apm_server_route_repository';
