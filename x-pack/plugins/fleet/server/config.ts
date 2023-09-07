/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';

import { schema } from '@kbn/config-schema';
import type { TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';

import {
  getExperimentalAllowedValues,
  isValidExperimentalValue,
} from '../common/experimental_features';
const allowedExperimentalValues = getExperimentalAllowedValues();

import {
  PreconfiguredPackagesSchema,
  PreconfiguredAgentPoliciesSchema,
  PreconfiguredOutputsSchema,
  PreconfiguredFleetServerHostsSchema,
  PreconfiguredFleetProxiesSchema,
} from './types';
import { BULK_CREATE_MAX_ARTIFACTS_BYTES } from './services/artifacts/artifacts';

const DEFAULT_BUNDLED_PACKAGE_LOCATION = path.join(__dirname, '../target/bundled_packages');
const DEFAULT_GPG_KEY_PATH = path.join(__dirname, '../target/keys/GPG-KEY-elasticsearch');

export const config: PluginConfigDescriptor = {
  exposeToBrowser: {
    epm: true,
    agents: {
      enabled: true,
    },
    enableExperimental: true,
    developer: {
      maxAgentPoliciesWithInactivityTimeout: true,
    },
    internal: {
      fleetServerStandalone: true,
      disableProxies: true,
      activeAgentsSoftLimit: true,
    },
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
    // Deprecate default policy flags
    (fullConfig, fromPath, addDeprecation) => {
      if (
        (fullConfig?.xpack?.fleet?.agentPolicies || []).find((policy: any) => policy.is_default)
      ) {
        addDeprecation({
          configPath: 'xpack.fleet.agentPolicies.is_default',
          message: `Config key [xpack.fleet.agentPolicies.is_default] is deprecated.`,
          correctiveActions: {
            manualSteps: [`Create a dedicated policy instead through the UI or API.`],
          },
          level: 'warning',
        });
      }
      return fullConfig;
    },
    (fullConfig, fromPath, addDeprecation) => {
      if (
        (fullConfig?.xpack?.fleet?.agentPolicies || []).find(
          (policy: any) => policy.is_default_fleet_server
        )
      ) {
        addDeprecation({
          configPath: 'xpack.fleet.agentPolicies.is_default_fleet_server',
          message: `Config key [xpack.fleet.agentPolicies.is_default_fleet_server] is deprecated.`,
          correctiveActions: {
            manualSteps: [`Create a dedicated fleet server policy instead through the UI or API.`],
          },
          level: 'warning',
        });
      }
      return fullConfig;
    },
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
    fleetServerHosts: PreconfiguredFleetServerHostsSchema,
    proxies: PreconfiguredFleetProxiesSchema,
    agentIdVerificationEnabled: schema.boolean({ defaultValue: true }),
    setup: schema.maybe(
      schema.object({
        agentPolicySchemaUpgradeBatchSize: schema.maybe(schema.number()),
      })
    ),
    developer: schema.object({
      maxAgentPoliciesWithInactivityTimeout: schema.maybe(schema.number()),
      disableRegistryVersionCheck: schema.boolean({ defaultValue: false }),
      allowAgentUpgradeSourceUri: schema.boolean({ defaultValue: false }),
      bundledPackageLocation: schema.string({ defaultValue: DEFAULT_BUNDLED_PACKAGE_LOCATION }),
    }),
    packageVerification: schema.object({
      gpgKeyPath: schema.string({ defaultValue: DEFAULT_GPG_KEY_PATH }),
    }),
    /**
     * For internal use. A list of string values (comma delimited) that will enable experimental
     * type of functionality that is not yet released.
     *
     * @example
     * xpack.fleet.enableExperimental:
     *   - feature1
     *   - feature2
     */
    enableExperimental: schema.arrayOf(schema.string(), {
      defaultValue: () => [],
      validate(list) {
        for (const key of list) {
          if (!isValidExperimentalValue(key)) {
            return `[${key}] is not allowed. Allowed values are: ${allowedExperimentalValues.join(
              ', '
            )}`;
          }
        }
      },
    }),

    internal: schema.maybe(
      schema.object({
        disableILMPolicies: schema.boolean({
          defaultValue: false,
        }),
        disableProxies: schema.boolean({
          defaultValue: false,
        }),
        fleetServerStandalone: schema.boolean({
          defaultValue: false,
        }),
        activeAgentsSoftLimit: schema.maybe(
          schema.number({
            min: 0,
          })
        ),
        capabilities: schema.arrayOf(
          schema.oneOf([
            // See package-spec for the list of available capiblities https://github.com/elastic/package-spec/blob/dcc37b652690f8a2bca9cf8a12fc28fd015730a0/spec/integration/manifest.spec.yml#L113
            schema.literal('apm'),
            schema.literal('enterprise_search'),
            schema.literal('observability'),
            schema.literal('security'),
            schema.literal('serverless_search'),
            schema.literal('uptime'),
          ]),
          { defaultValue: [] }
        ),
      })
    ),
    enabled: schema.boolean({ defaultValue: true }),
    /**
     * The max size of the artifacts encoded_size sum in a batch when more than one (there is at least one artifact in a batch).
     * @example
     * artifact1.encoded_size = 400
     * artifact2.encoded_size = 600
     * artifact3.encoded_size = 1_200
     * and
     * createArtifactsBulkBatchSize: 1_000
     * then
     * batch1 = [artifact1, artifact2]
     * batch2 = [artifact3]
     */
    createArtifactsBulkBatchSize: schema.maybe(
      schema.number({
        defaultValue: BULK_CREATE_MAX_ARTIFACTS_BYTES,
        max: 4_000_000,
        min: 400,
      })
    ),
  }),
};

export type FleetConfigType = TypeOf<typeof config.schema>;
