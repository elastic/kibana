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

export { default as apm } from 'elastic-apm-node';
export type {
  AgentService,
  ESIndexPatternService,
  PackageService,
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
} from './types';
export { AgentNotFoundError } from './errors';

export const config: PluginConfigDescriptor = {
  exposeToBrowser: {
    epm: true,
    agents: {
      enabled: true,
    },
  },
  deprecations: ({ deprecate, renameFromRoot, unused, unusedFromRoot }) => [
    deprecate('enabled', '8.0.0'),
    // Fleet plugin was named ingestManager before
    renameFromRoot('xpack.ingestManager.enabled', 'xpack.fleet.enabled', { level: 'critical' }),
    renameFromRoot('xpack.ingestManager.registryUrl', 'xpack.fleet.registryUrl', {
      level: 'critical',
    }),
    renameFromRoot('xpack.ingestManager.registryProxyUrl', 'xpack.fleet.registryProxyUrl', {
      level: 'critical',
    }),
    renameFromRoot('xpack.ingestManager.fleet', 'xpack.ingestManager.agents', {
      level: 'critical',
    }),
    renameFromRoot('xpack.ingestManager.agents.enabled', 'xpack.fleet.agents.enabled', {
      level: 'critical',
    }),
    renameFromRoot('xpack.ingestManager.agents.elasticsearch', 'xpack.fleet.agents.elasticsearch', {
      level: 'critical',
    }),
    renameFromRoot(
      'xpack.ingestManager.agents.tlsCheckDisabled',
      'xpack.fleet.agents.tlsCheckDisabled',
      { level: 'critical' }
    ),
    renameFromRoot(
      'xpack.ingestManager.agents.pollingRequestTimeout',
      'xpack.fleet.agents.pollingRequestTimeout',
      { level: 'critical' }
    ),
    renameFromRoot(
      'xpack.ingestManager.agents.maxConcurrentConnections',
      'xpack.fleet.agents.maxConcurrentConnections',
      { level: 'critical' }
    ),
    renameFromRoot('xpack.ingestManager.agents.kibana', 'xpack.fleet.agents.kibana', {
      level: 'critical',
    }),
    renameFromRoot(
      'xpack.ingestManager.agents.agentPolicyRolloutRateLimitIntervalMs',
      'xpack.fleet.agents.agentPolicyRolloutRateLimitIntervalMs',
      { level: 'critical' }
    ),
    renameFromRoot(
      'xpack.ingestManager.agents.agentPolicyRolloutRateLimitRequestPerInterval',
      'xpack.fleet.agents.agentPolicyRolloutRateLimitRequestPerInterval',
      { level: 'critical' }
    ),
    unusedFromRoot('xpack.ingestManager', { level: 'critical' }),
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
    enabled: schema.boolean({ defaultValue: true }),
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
