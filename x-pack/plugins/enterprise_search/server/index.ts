/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginInitializerContext, PluginConfigDescriptor } from '@kbn/core/server';

import { EnterpriseSearchPlugin } from './plugin';

export const plugin = (initializerContext: PluginInitializerContext) => {
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
  hasNativeConnectors: schema.boolean({ defaultValue: true }),
  hasWebCrawler: schema.boolean({ defaultValue: true }),
  host: schema.maybe(schema.string()),
  ssl: schema.object({
    certificateAuthorities: schema.maybe(
      schema.oneOf([schema.arrayOf(schema.string(), { minSize: 1 }), schema.string()])
    ),
    verificationMode: schema.oneOf(
      [schema.literal('none'), schema.literal('certificate'), schema.literal('full')],
      { defaultValue: 'full' }
    ),
  }),
});

export type ConfigType = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<ConfigType> = {
  exposeToBrowser: {
    canDeployEntSearch: true,
    host: true,
  },
  schema: configSchema,
};
export const CONNECTORS_INDEX = '.elastic-connectors';
export const CURRENT_CONNECTORS_INDEX = '.elastic-connectors-v1';
export const CONNECTORS_JOBS_INDEX = '.elastic-connectors-sync-jobs';
export const CONNECTORS_VERSION = 1;
export const CRAWLERS_INDEX = '.ent-search-actastic-crawler2_configurations_v2';
