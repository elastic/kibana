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
  ExternalCallback,
} from './plugin';

export const config = {
  exposeToBrowser: {
    epm: true,
    fleet: true,
  },
  schema: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    registryUrl: schema.maybe(schema.uri()),
    fleet: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
      tlsCheckDisabled: schema.boolean({ defaultValue: false }),
      pollingRequestTimeout: schema.number({ defaultValue: 60000 }),
      maxConcurrentConnections: schema.number({ defaultValue: 0 }),
      kibana: schema.object({
        host: schema.maybe(schema.string()),
        ca_sha256: schema.maybe(schema.string()),
      }),
      elasticsearch: schema.object({
        host: schema.maybe(schema.string()),
        ca_sha256: schema.maybe(schema.string()),
      }),
      agentConfigRollupRateLimitIntervalMs: schema.number({ defaultValue: 5000 }),
      agentConfigRollupRateLimitRequestPerInterval: schema.number({ defaultValue: 50 }),
    }),
  }),
};

export type IngestManagerConfigType = TypeOf<typeof config.schema>;

export { PackageConfigServiceInterface } from './services/package_config';

export const plugin = (initializerContext: PluginInitializerContext) => {
  return new IngestManagerPlugin(initializerContext);
};
