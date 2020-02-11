/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema, TypeOf } from '@kbn/config-schema';
import { PluginInitializerContext } from 'kibana/server';
import { DEFAULT_REGISTRY_URL } from './constants';
import { IngestManagerPlugin } from './plugin';

export const config = {
  exposeToBrowser: {
    epm: true,
    fleet: true,
  },
  schema: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    epm: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
      registryUrl: schema.uri({ defaultValue: DEFAULT_REGISTRY_URL }),
    }),
    fleet: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
      defaultOutputHost: schema.string({ defaultValue: 'http://localhost:9200' }),
    }),
  }),
};

export type IngestManagerConfigType = TypeOf<typeof config.schema>;

export const plugin = (initializerContext: PluginInitializerContext) => {
  return new IngestManagerPlugin(initializerContext);
};

// Saved object information bootstrapped by legacy `ingest_manager` plugin
// TODO: Remove once saved object mappings can be done from NP
export { savedObjectMappings } from './saved_objects';
export {
  OUTPUT_SAVED_OBJECT_TYPE,
  AGENT_CONFIG_SAVED_OBJECT_TYPE,
  DATASOURCE_SAVED_OBJECT_TYPE,
  PACKAGES_SAVED_OBJECT_TYPE,
} from './constants';

// TODO: Temporary exports for Fleet dependencies, remove once Fleet moved into this plugin
export { agentConfigService, outputService } from './services';
