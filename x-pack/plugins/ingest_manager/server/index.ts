/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema, TypeOf } from '@kbn/config-schema';
import { PluginInitializerContext } from 'src/core/server';
import { IngestManagerPlugin } from './plugin';
import {
  AGENT_CONFIG_ROLLOUT_RATE_LIMIT_INTERVAL_MS,
  AGENT_CONFIG_ROLLOUT_RATE_LIMIT_REQUEST_PER_INTERVAL,
} from '../common';
export { AgentService, ESIndexPatternService, getRegistryUrl } from './services';
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
      agentConfigRolloutRateLimitIntervalMs: schema.number({
        defaultValue: AGENT_CONFIG_ROLLOUT_RATE_LIMIT_INTERVAL_MS,
      }),
      agentConfigRolloutRateLimitRequestPerInterval: schema.number({
        defaultValue: AGENT_CONFIG_ROLLOUT_RATE_LIMIT_REQUEST_PER_INTERVAL,
      }),
    }),
  }),
};

export type IngestManagerConfigType = TypeOf<typeof config.schema>;

export { PackageConfigServiceInterface } from './services/package_config';

export const plugin = (initializerContext: PluginInitializerContext) => {
  return new IngestManagerPlugin(initializerContext);
};
