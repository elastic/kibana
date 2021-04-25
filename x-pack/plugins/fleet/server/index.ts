/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor, PluginInitializerContext } from 'src/core/server';

import { PreconfiguredPackagesSchema, PreconfiguredAgentPoliciesSchema } from './types';

import { FleetPlugin } from './plugin';

export { default as apm } from 'elastic-apm-node';
export {
  AgentService,
  ESIndexPatternService,
  getRegistryUrl,
  PackageService,
  AgentPolicyServiceInterface,
  ArtifactsClientInterface,
  Artifact,
} from './services';
export { FleetSetupContract, FleetSetupDeps, FleetStartContract, ExternalCallback } from './plugin';
export { AgentNotFoundError } from './errors';

export const config: PluginConfigDescriptor = {
  exposeToBrowser: {
    epm: true,
    agents: true,
  },
  deprecations: ({ renameFromRoot, unused }) => [
    renameFromRoot('xpack.ingestManager', 'xpack.fleet'),
    renameFromRoot('xpack.fleet.fleet', 'xpack.fleet.agents'),
    unused('agents.kibana'),
    unused('agents.maxConcurrentConnections'),
    unused('agents.agentPolicyRolloutRateLimitIntervalMs'),
    unused('agents.agentPolicyRolloutRateLimitRequestPerInterval'),
    unused('agents.pollingRequestTimeout'),
    unused('agents.tlsCheckDisabled'),
    unused('agents.fleetServerEnabled'),
  ],
  schema: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    registryUrl: schema.maybe(schema.uri({ scheme: ['http', 'https'] })),
    registryProxyUrl: schema.maybe(schema.uri({ scheme: ['http', 'https'] })),
    agents: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
      elasticsearch: schema.object({
        host: schema.maybe(schema.string()),
        ca_sha256: schema.maybe(schema.string()),
      }),
      fleet_server: schema.maybe(
        schema.object({
          hosts: schema.maybe(schema.arrayOf(schema.uri({ scheme: ['http', 'https'] }))),
        })
      ),
    }),
    packages: PreconfiguredPackagesSchema,
    agentPolicies: PreconfiguredAgentPoliciesSchema,
  }),
};

export type FleetConfigType = TypeOf<typeof config.schema>;

export { PackagePolicyServiceInterface } from './services/package_policy';

export { relativeDownloadUrlFromArtifact } from './services/artifacts/mappings';

export const plugin = (initializerContext: PluginInitializerContext) => {
  return new FleetPlugin(initializerContext);
};
