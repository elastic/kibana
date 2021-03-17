/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import type { TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor, PluginInitializerContext } from 'src/core/server';

import {
  AGENT_POLICY_ROLLOUT_RATE_LIMIT_INTERVAL_MS,
  AGENT_POLICY_ROLLOUT_RATE_LIMIT_REQUEST_PER_INTERVAL,
  AGENT_POLLING_REQUEST_TIMEOUT_MS,
} from '../common';

import { FleetPlugin } from './plugin';

const semverRegex = () =>
  /^([0-9]+)\.([0-9]+)\.([0-9]+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+)?$/;

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

const varsSchema = schema.maybe(
  schema.recordOf(
    schema.string(),
    schema.object({
      type: schema.maybe(schema.string()),
      value: schema.oneOf([schema.string(), schema.number()]),
    })
  )
);

export const config: PluginConfigDescriptor = {
  exposeToBrowser: {
    epm: true,
    agents: true,
  },
  deprecations: ({ renameFromRoot, unused }) => [
    renameFromRoot('xpack.ingestManager', 'xpack.fleet'),
    renameFromRoot('xpack.fleet.fleet', 'xpack.fleet.agents'),
    unused('agents.fleetServerEnabled'),
  ],
  schema: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    registryUrl: schema.maybe(schema.uri({ scheme: ['http', 'https'] })),
    registryProxyUrl: schema.maybe(schema.uri({ scheme: ['http', 'https'] })),
    agents: schema.object({
      enabled: schema.boolean({ defaultValue: true }),
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
    packages: schema.maybe(
      schema.arrayOf(
        schema.object({
          name: schema.string(),
          version: schema.string({
            validate: (value) => {
              if (!semverRegex().test(value)) {
                return i18n.translate('xpack.fleet.config.invalidPackageVersionError', {
                  defaultMessage: 'must be a valid semver',
                });
              }
            },
          }),
        })
      )
    ),
    agentPolicies: schema.maybe(
      schema.arrayOf(
        schema.object({
          name: schema.string(),
          id: schema.oneOf([schema.string(), schema.number()]),
          namespace: schema.maybe(schema.string()),
          description: schema.maybe(schema.string()),
          monitoring_enabled: schema.maybe(
            schema.arrayOf(schema.oneOf([schema.literal('logs'), schema.literal('metrics')]))
          ),
          package_policies: schema.arrayOf(
            schema.object({
              name: schema.string(),
              package: schema.object({
                name: schema.string(),
              }),
              description: schema.maybe(schema.string()),
              namespace: schema.maybe(schema.string()),
              inputs: schema.maybe(
                schema.arrayOf(
                  schema.object({
                    type: schema.string(),
                    enabled: schema.maybe(schema.boolean()),
                    vars: varsSchema,
                    streams: schema.maybe(
                      schema.arrayOf(
                        schema.object({
                          data_stream: schema.object({
                            type: schema.string(),
                            dataset: schema.string(),
                          }),
                          enabled: schema.maybe(schema.boolean()),
                          vars: varsSchema,
                        })
                      )
                    ),
                  })
                )
              ),
            })
          ),
        })
      )
    ),
  }),
};

export type FleetConfigType = TypeOf<typeof config.schema>;

export { PackagePolicyServiceInterface } from './services/package_policy';

export { relativeDownloadUrlFromArtifact } from './services/artifacts/mappings';

export const plugin = (initializerContext: PluginInitializerContext) => {
  return new FleetPlugin(initializerContext);
};
