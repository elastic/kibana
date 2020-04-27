/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema, TypeOf } from '@kbn/config-schema';
import { PluginInitializerContext } from 'src/core/server';
import { IngestManagerPlugin } from './plugin';
export { AgentService, ESIndexPatternService } from './services';
export {
  IngestManagerSetupContract,
  IngestManagerSetupDeps,
  IngestManagerStartContract,
} from './plugin';

export const config = {
  exposeToBrowser: {
    epm: true,
    fleet: true,
  },
  schema: schema.object({
    enabled: schema.boolean({ defaultValue: false }),
    epm: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
      registryUrl: schema.maybe(schema.uri()),
    }),
    fleet: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
      kibana: schema.object({
        host: schema.maybe(schema.string()),
        ca_sha256: schema.maybe(schema.string()),
      }),
      elasticsearch: schema.object({
        host: schema.string({ defaultValue: 'http://localhost:9200' }),
        ca_sha256: schema.maybe(schema.string()),
      }),
    }),
  }),
};

export type IngestManagerConfigType = TypeOf<typeof config.schema>;

export const plugin = (initializerContext: PluginInitializerContext) => {
  return new IngestManagerPlugin(initializerContext);
};
