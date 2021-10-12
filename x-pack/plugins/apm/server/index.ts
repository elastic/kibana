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
  indices: schema.object({
    transactions: schema.string({ defaultValue: 'traces-apm*,apm-*' }),
    spans: schema.string({ defaultValue: 'traces-apm*,apm-*' }),
    errors: schema.string({ defaultValue: 'logs-apm*,apm-*' }),
    metrics: schema.string({ defaultValue: 'metrics-apm*,apm-*' }),
    sourcemaps: schema.string({ defaultValue: 'apm-*' }),
    onboarding: schema.string({ defaultValue: 'apm-*' }),
  }),
});

// plugin config
export const config: PluginConfigDescriptor<APMConfig> = {
  deprecations: ({
    deprecate,
    renameFromRoot,
    deprecateFromRoot,
    unusedFromRoot,
  }) => [
    deprecate('enabled', '8.0.0'),
    renameFromRoot(
      'apm_oss.transactionIndices',
      'xpack.apm.indices.transactions'
    ),
    renameFromRoot('apm_oss.spanIndices', 'xpack.apm.indices.spans'),
    renameFromRoot('apm_oss.errorIndices', 'xpack.apm.indices.errors'),
    renameFromRoot('apm_oss.metricsIndices', 'xpack.apm.indices.metrics'),
    renameFromRoot('apm_oss.sourcemapIndices', 'xpack.apm.indices.sourcemaps'),
    renameFromRoot('apm_oss.onboardingIndices', 'xpack.apm.indices.onboarding'),
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

export type APMConfig = TypeOf<typeof configSchema>;

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
