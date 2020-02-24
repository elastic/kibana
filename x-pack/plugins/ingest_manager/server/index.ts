/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { PluginInitializerContext } from 'kibana/server';
import { IngestManagerPlugin } from './plugin';

export const config = {
  exposeToBrowser: {
    epm: true,
    fleet: true,
  },
  schema: schema.object({
    enabled: schema.boolean({ defaultValue: false }),
    epm: schema.object({
      enabled: schema.boolean({ defaultValue: false }),
      registryUrl: schema.uri({ defaultValue: 'https://epr-staging.elastic.co' }),
    }),
    fleet: schema.object({
      enabled: schema.boolean({ defaultValue: false }),
      defaultOutputHost: schema.string({ defaultValue: 'http://localhost:9200' }),
    }),
  }),
};

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
} from './constants';

// TODO: Temporary exports for Fleet dependencies, remove once Fleet moved into this plugin
export { agentConfigService, outputService } from './services';
