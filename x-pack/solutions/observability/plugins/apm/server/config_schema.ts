/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { offeringBasedSchema, schema } from '@kbn/config-schema';
import { SearchAggregatedTransactionSetting } from '../common/aggregated_transactions';

const disabledOnServerless = offeringBasedSchema({
  serverless: schema.boolean({
    defaultValue: false,
  }),
  traditional: schema.oneOf([schema.literal(true)], { defaultValue: true }),
});

// All options should be documented in the APM configuration settings: https://github.com/elastic/kibana/blob/main/docs/settings/apm-settings.asciidoc
// and be included on cloud allow list unless there are specific reasons not to
export const configSchema = schema.object({
  autoCreateApmDataView: schema.boolean({ defaultValue: true }),
  serviceMapEnabled: schema.boolean({ defaultValue: true }),
  serviceMapFingerprintBucketSize: schema.number({ defaultValue: 100 }),
  serviceMapFingerprintGlobalBucketSize: schema.number({
    defaultValue: 1000,
  }),
  serviceMapMaxAllowableBytes: schema.number({ defaultValue: 2_576_980_377 }), // 2.4GB
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

  forceSyntheticSource: schema.boolean({ defaultValue: false }), // deprecated
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
  managedOtlpServiceUrl: offeringBasedSchema({
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
    // to be removed in https://github.com/elastic/kibana/issues/221904
    profilingIntegrationAvailable: schema.boolean({ defaultValue: false }),
    ruleFormV2Enabled: schema.boolean({ defaultValue: false }),
  }),
  serverless: schema.object({
    enabled: offeringBasedSchema({
      serverless: schema.literal(true),
      options: { defaultValue: schema.contextRef('serverless') },
    }),
  }),
});
