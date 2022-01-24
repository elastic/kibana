/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor, PluginInitializerContext } from 'src/core/server';

import {
  PreconfiguredPackagesSchema,
  PreconfiguredAgentPoliciesSchema,
  PreconfiguredOutputsSchema,
} from './types';

import { FleetPlugin } from './plugin';

export type {
  AgentService,
  AgentClient,
  ESIndexPatternService,
  PackageService,
  PackageClient,
  AgentPolicyServiceInterface,
  ArtifactsClientInterface,
  Artifact,
  ListArtifactsProps,
} from './services';
export { getRegistryUrl } from './services';

export type { FleetSetupContract, FleetSetupDeps, FleetStartContract } from './plugin';
export type {
  ExternalCallback,
  PutPackagePolicyUpdateCallback,
  PostPackagePolicyDeleteCallback,
  PostPackagePolicyCreateCallback,
  FleetRequestHandlerContext,
} from './types';
export { AgentNotFoundError, FleetUnauthorizedError } from './errors';

export const config: PluginConfigDescriptor = {
  exposeToBrowser: {
    epm: true,
    agents: true,
  },
  deprecations: ({ renameFromRoot, unused, unusedFromRoot }) => [
    // Unused settings before Fleet server exists
    unused('agents.kibana', { level: 'critical' }),
    unused('agents.maxConcurrentConnections', { level: 'critical' }),
    unused('agents.agentPolicyRolloutRateLimitIntervalMs', { level: 'critical' }),
    unused('agents.agentPolicyRolloutRateLimitRequestPerInterval', { level: 'critical' }),
    unused('agents.pollingRequestTimeout', { level: 'critical' }),
    unused('agents.tlsCheckDisabled', { level: 'critical' }),
    unused('agents.fleetServerEnabled', { level: 'critical' }),
    // Renaming elasticsearch.host => elasticsearch.hosts
    (fullConfig, fromPath, addDeprecation) => {
      const oldValue = fullConfig?.xpack?.fleet?.agents?.elasticsearch?.host;
      if (oldValue) {
        delete fullConfig.xpack.fleet.agents.elasticsearch.host;
        fullConfig.xpack.fleet.agents.elasticsearch.hosts = [oldValue];
        addDeprecation({
          configPath: 'xpack.fleet.agents.elasticsearch.host',
          message: `Config key [xpack.fleet.agents.elasticsearch.host] is deprecated and replaced by [xpack.fleet.agents.elasticsearch.hosts]`,
          correctiveActions: {
            manualSteps: [
              `Use [xpack.fleet.agents.elasticsearch.hosts] with an array of host instead.`,
            ],
          },
          level: 'critical',
        });
      }

      return fullConfig;
    },
  ],
  schema: schema.object({
    registryUrl: schema.maybe(schema.uri({ scheme: ['http', 'https'] })),
    registryProxyUrl: schema.maybe(schema.uri({ scheme: ['http', 'https'] })),
    agents: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
      elasticsearch: schema.object({
        hosts: schema.maybe(schema.arrayOf(schema.uri({ scheme: ['http', 'https'] }))),
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
    outputs: PreconfiguredOutputsSchema,
    agentIdVerificationEnabled: schema.boolean({ defaultValue: true }),
    developer: schema.object({
      disableRegistryVersionCheck: schema.boolean({ defaultValue: false }),
      allowAgentUpgradeSourceUri: schema.boolean({ defaultValue: false }),
    }),
  }),
};

export type FleetConfigType = TypeOf<typeof config.schema>;

export type { PackagePolicyServiceInterface } from './services/package_policy';

export { relativeDownloadUrlFromArtifact } from './services/artifacts/mappings';

export const plugin = (initializerContext: PluginInitializerContext) => {
  return new FleetPlugin(initializerContext);
};
