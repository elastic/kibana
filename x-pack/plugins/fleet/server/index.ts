/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor, PluginInitializerContext } from 'src/core/server';
import { FleetPlugin } from './plugin';
import {
  AGENT_POLICY_ROLLOUT_RATE_LIMIT_INTERVAL_MS,
  AGENT_POLICY_ROLLOUT_RATE_LIMIT_REQUEST_PER_INTERVAL,
  AGENT_POLLING_REQUEST_TIMEOUT_MS,
} from '../common';

export { default as apm } from 'elastic-apm-node';
export {
  AgentService,
  ESIndexPatternService,
  getRegistryUrl,
  PackageService,
  AgentPolicyServiceInterface,
} from './services';
export { FleetSetupContract, FleetSetupDeps, FleetStartContract, ExternalCallback } from './plugin';

export const config: PluginConfigDescriptor = {
  exposeToBrowser: {
    epm: true,
    agents: true,
  },
  deprecations: ({ renameFromRoot }) => [
    renameFromRoot('xpack.ingestManager', 'xpack.fleet'),
    renameFromRoot('xpack.fleet.fleet', 'xpack.fleet.agents'),
  ],
  schema: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    registryUrl: schema.maybe(schema.uri({ scheme: ['http', 'https'] })),
    registryProxyUrl: schema.maybe(schema.uri({ scheme: ['http', 'https'] })),
    agents: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
      fleetServerEnabled: schema.boolean({ defaultValue: false }),
      tlsCheckDisabled: schema.boolean({ defaultValue: false }),
      pollingRequestTimeout: schema.number({
        defaultValue: AGENT_POLLING_REQUEST_TIMEOUT_MS,
        min: 5000,
      }),
      maxConcurrentConnections: schema.number({ defaultValue: 0 }),
      kibana: schema.object({
        host: schema.maybe(
          schema.oneOf([
            schema.uri({ scheme: ['http', 'https'] }),
            schema.arrayOf(schema.uri({ scheme: ['http', 'https'] }), { minSize: 1 }),
          ])
        ),
        ca_sha256: schema.maybe(schema.string()),
      }),
      elasticsearch: schema.object({
        host: schema.maybe(schema.string()),
        ca_sha256: schema.maybe(schema.string()),
      }),
      agentPolicyRolloutRateLimitIntervalMs: schema.number({
        defaultValue: AGENT_POLICY_ROLLOUT_RATE_LIMIT_INTERVAL_MS,
      }),
      agentPolicyRolloutRateLimitRequestPerInterval: schema.number({
        defaultValue: AGENT_POLICY_ROLLOUT_RATE_LIMIT_REQUEST_PER_INTERVAL,
      }),
    }),
  }),
};

export type FleetConfigType = TypeOf<typeof config.schema>;

export { PackagePolicyServiceInterface } from './services/package_policy';

export const plugin = (initializerContext: PluginInitializerContext) => {
  return new FleetPlugin(initializerContext);
};
