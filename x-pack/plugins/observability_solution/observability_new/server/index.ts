/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { offeringBasedSchema, schema, TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import { SearchAggregatedTransactionSetting } from '../common/features/apm/aggregated_transactions';
import type { ObservabilityAIAssistantConfig } from './config';

export type { ObservabilityAIAssistantServerRouteRepository } from './features/ai_assistant/routes/get_global_observability_ai_assistant_route_repository';

export type { ObservabilityPluginStart, ObservabilityPluginSetup } from './types';

const disabledOnServerless = offeringBasedSchema({
  serverless: schema.boolean({
    defaultValue: false,
  }),
  traditional: schema.oneOf([schema.literal(true)], { defaultValue: true }),
});

const configSchema = schema.object({
  apm: schema.object({
    autoCreateApmDataView: schema.boolean({ defaultValue: true }),
    serviceMapEnabled: schema.boolean({ defaultValue: true }),
    serviceMapFingerprintBucketSize: schema.number({ defaultValue: 100 }),
    serviceMapFingerprintGlobalBucketSize: schema.number({
      defaultValue: 1000,
    }),
    serviceMapTraceIdBucketSize: schema.number({ defaultValue: 65 }),
    serviceMapTraceIdGlobalBucketSize: schema.number({ defaultValue: 6 }),
    serviceMapMaxTracesPerRequest: schema.number({ defaultValue: 50 }),
    serviceMapTerminateAfter: schema.number({ defaultValue: 100_000 }),
    serviceMapMaxTraces: schema.number({ defaultValue: 1000 }),
    ui: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
      maxTraceItems: schema.number({ defaultValue: 5000 }),
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
    agent: schema.object({
      migrations: schema.object({
        enabled: schema.boolean({ defaultValue: false }),
      }),
    }),
    forceSyntheticSource: schema.boolean({ defaultValue: false }),
    latestAgentVersionsUrl: schema.string({
      defaultValue: 'https://apm-agent-versions.elastic.co/versions.json',
    }),
    enabled: schema.boolean({ defaultValue: true }),
    serverlessOnboarding: offeringBasedSchema({
      serverless: schema.boolean({ defaultValue: false }),
    }),
    managedServiceUrl: offeringBasedSchema({
      serverless: schema.string({ defaultValue: '' }),
    }),
    featureFlags: schema.object({
      agentConfigurationAvailable: disabledOnServerless,
      configurableIndicesAvailable: disabledOnServerless,
      infrastructureTabAvailable: disabledOnServerless,
      infraUiAvailable: disabledOnServerless,
      migrationToFleetAvailable: disabledOnServerless,
      sourcemapApiAvailable: disabledOnServerless,
      storageExplorerAvailable: disabledOnServerless,
      /**
       * Depends on optional "profilingDataAccess" and "profiling"
       * plugins. Enable both with `xpack.profiling.enabled: true` before
       * enabling this feature flag.
       */
      profilingIntegrationAvailable: schema.boolean({ defaultValue: false }),
    }),
    serverless: schema.object({
      enabled: offeringBasedSchema({
        serverless: schema.literal(true),
        options: { defaultValue: schema.contextRef('serverless') },
      }),
    }),
  }),
  annotations: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    index: schema.string({ defaultValue: 'observability-annotations' }),
  }),
  unsafe: schema.object({
    alertDetails: schema.object({
      metrics: schema.object({
        enabled: schema.boolean({ defaultValue: false }),
      }),
      logs: schema.object({
        enabled: schema.boolean({ defaultValue: false }),
      }),
      uptime: schema.object({
        enabled: schema.boolean({ defaultValue: false }),
      }),
      observability: schema.object({
        enabled: schema.boolean({ defaultValue: false }),
      }),
    }),
    thresholdRule: schema.object({
      enabled: offeringBasedSchema({
        serverless: schema.boolean({ defaultValue: false }),
        traditional: schema.boolean({ defaultValue: false }),
      }),
    }),
  }),
  customThresholdRule: schema.object({
    groupByPageSize: schema.number({ defaultValue: 10_000 }),
  }),
  enabled: schema.boolean({ defaultValue: true }),
  createO11yGenericFeatureId: schema.boolean({ defaultValue: false }),
  sloOrphanSummaryCleanUpTaskEnabled: schema.boolean({ defaultValue: true }),
});

export const config: PluginConfigDescriptor = {
  exposeToBrowser: {
    unsafe: true,
    aiAssistant: {
      enabled: true,
      feedback: {
        enabled: true,
      },
    },
  },
  deprecations: ({ unusedFromRoot, unused }) => [
    unusedFromRoot('xpack.observability.aiAssistant.enabled', {
      level: 'warning',
    }),
    unusedFromRoot('xpack.observability.aiAssistant.provider.azureOpenAI.deploymentId', {
      level: 'warning',
    }),
    unusedFromRoot('xpack.observability.aiAssistant.provider.azureOpenAI.resourceName', {
      level: 'warning',
    }),
    unusedFromRoot('xpack.observability.aiAssistant.provider.azureOpenAI.apiKey', {
      level: 'warning',
    }),
    unusedFromRoot('xpack.observability.aiAssistant.provider.openAI.apiKey', {
      level: 'warning',
    }),
    unusedFromRoot('xpack.observability.aiAssistant.provider.openAI.model', {
      level: 'warning',
    }),
    unused('unsafe.thresholdRule.enabled', { level: 'warning' }),
    unused('unsafe.alertDetails.logs.enabled', { level: 'warning' }),
    unused('unsafe.alertDetails.observability.enabled', { level: 'warning' }),
  ],
  schema: configSchema,
};

export const plugin = async (ctx: PluginInitializerContext<ObservabilityAIAssistantConfig>) => {
  const { ObservabilityPlugin } = await import('./plugin');
  return new ObservabilityPlugin(ctx);
};

export type ObservabilityConfig = TypeOf<typeof configSchema>;

/*

const disabledOnServerless = offeringBasedSchema({
  serverless: schema.boolean({
    defaultValue: false,
  }),
  traditional: schema.oneOf([schema.literal(true)], { defaultValue: true }),
});

// All options should be documented in the APM configuration settings: https://github.com/elastic/kibana/blob/main/docs/settings/apm-settings.asciidoc
// and be included on cloud allow list unless there are specific reasons not to
const configSchema = schema.object({
  autoCreateApmDataView: schema.boolean({ defaultValue: true }),
  serviceMapEnabled: schema.boolean({ defaultValue: true }),
  serviceMapFingerprintBucketSize: schema.number({ defaultValue: 100 }),
  serviceMapFingerprintGlobalBucketSize: schema.number({
    defaultValue: 1000,
  }),
  serviceMapTraceIdBucketSize: schema.number({ defaultValue: 65 }),
  serviceMapTraceIdGlobalBucketSize: schema.number({ defaultValue: 6 }),
  serviceMapMaxTracesPerRequest: schema.number({ defaultValue: 50 }),
  serviceMapTerminateAfter: schema.number({ defaultValue: 100_000 }),
  serviceMapMaxTraces: schema.number({ defaultValue: 1000 }),
  ui: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    maxTraceItems: schema.number({ defaultValue: 5000 }),
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
  agent: schema.object({
    migrations: schema.object({
      enabled: schema.boolean({ defaultValue: false }),
    }),
  }),
  forceSyntheticSource: schema.boolean({ defaultValue: false }),
  latestAgentVersionsUrl: schema.string({
    defaultValue: 'https://apm-agent-versions.elastic.co/versions.json',
  }),
  enabled: schema.boolean({ defaultValue: true }),
  serverlessOnboarding: offeringBasedSchema({
    serverless: schema.boolean({ defaultValue: false }),
  }),
  managedServiceUrl: offeringBasedSchema({
    serverless: schema.string({ defaultValue: '' }),
  }),
  featureFlags: schema.object({
    agentConfigurationAvailable: disabledOnServerless,
    configurableIndicesAvailable: disabledOnServerless,
    infrastructureTabAvailable: disabledOnServerless,
    infraUiAvailable: disabledOnServerless,
    migrationToFleetAvailable: disabledOnServerless,
    sourcemapApiAvailable: disabledOnServerless,
    storageExplorerAvailable: disabledOnServerless,
    /**
     * Depends on optional "profilingDataAccess" and "profiling"
     * plugins. Enable both with `xpack.profiling.enabled: true` before
     * enabling this feature flag.
     *
    profilingIntegrationAvailable: schema.boolean({ defaultValue: false }),
  }),
  serverless: schema.object({
    enabled: offeringBasedSchema({
      serverless: schema.literal(true),
      options: { defaultValue: schema.contextRef('serverless') },
    }),
  }),
});

// plugin config
export const config: PluginConfigDescriptor<APMConfig> = {
  deprecations: ({
    rename,
    unused,
    renameFromRoot,
    deprecateFromRoot,
    unusedFromRoot,
  }) => [
    unused('ui.transactionGroupBucketSize', {
      level: 'warning',
    }),
    rename('autocreateApmIndexPattern', 'autoCreateApmDataView', {
      level: 'warning',
    }),
    deprecateFromRoot('apm_oss.enabled', '8.0.0', { level: 'warning' }),
    unusedFromRoot('apm_oss.fleetMode', { level: 'warning' }),
    unusedFromRoot('apm_oss.indexPattern', { level: 'warning' }),
    renameFromRoot(
      'xpack.apm.maxServiceEnvironments',
      `uiSettings.overrides[${maxSuggestions}]`,
      { level: 'warning' }
    ),
    renameFromRoot(
      'xpack.apm.maxServiceSelection',
      `uiSettings.overrides[${maxSuggestions}]`,
      { level: 'warning' }
    ),
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

*/
