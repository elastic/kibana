/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginInitializerContext, PluginConfigDescriptor } from '@kbn/core/server';

export const plugin = async (initializerContext: PluginInitializerContext) => {
  const { EnterpriseSearchPlugin } = await import('./plugin');
  return new EnterpriseSearchPlugin(initializerContext);
};

export const configSchema = schema.object({
  accessCheckTimeout: schema.number({ defaultValue: 5000 }),
  accessCheckTimeoutWarning: schema.number({ defaultValue: 300 }),
  canDeployEntSearch: schema.boolean({ defaultValue: true }),
  customHeaders: schema.maybe(schema.object({}, { unknowns: 'allow' })),
  enabled: schema.boolean({ defaultValue: true }),
  hasConnectors: schema.boolean({ defaultValue: true }),
  hasDefaultIngestPipeline: schema.boolean({ defaultValue: true }),
  hasDocumentLevelSecurityEnabled: schema.boolean({ defaultValue: true }),
  hasIncrementalSyncEnabled: schema.boolean({ defaultValue: true }),
  hasNativeConnectors: schema.boolean({ defaultValue: true }),
  hasWebCrawler: schema.boolean({ defaultValue: true }),
  host: schema.maybe(schema.string()),
  isCloud: schema.boolean({ defaultValue: false }),
  ssl: schema.object({
    certificateAuthorities: schema.maybe(
      schema.oneOf([schema.arrayOf(schema.string(), { minSize: 1 }), schema.string()])
    ),
    verificationMode: schema.oneOf(
      [schema.literal('none'), schema.literal('certificate'), schema.literal('full')],
      { defaultValue: 'full' }
    ),
  }),
  ui: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
  }),
});

export type ConfigType = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<ConfigType> = {
  exposeToBrowser: {
    canDeployEntSearch: true,
    host: true,
    ui: true,
  },
  schema: configSchema,
};

export const CRAWLERS_INDEX = '.ent-search-actastic-crawler2_configurations_v2';
