/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, Logger } from '@kbn/core/server';
import {
  APM_AGENT_CONFIGURATION_INDEX,
  APM_SOURCE_MAP_INDEX,
} from '../../settings/apm_indices/apm_system_index_constants';

const apiKeyMetadata = {
  application: 'apm',
  consumer: 'apm-server',
  system: true,
};

const indexLevelPrivileges = ['read' as const];

export async function createApmSourceMapApiKey({
  coreStart,
  logger,
  packagePolicyId,
}: {
  coreStart: CoreStart;
  logger: Logger;
  packagePolicyId: string;
}) {
  logger.debug('Creating source map API Key');

  const response =
    await coreStart.elasticsearch.client.asInternalUser.security.createApiKey({
      body: {
        name: `Source map read access (Package policy: "${packagePolicyId}")`,
        metadata: {
          ...apiKeyMetadata,
          description:
            'Provides read access to the source maps index. Created for APM Server',
          package_policy_id: packagePolicyId,
          type: 'source-map',
        },
        role_descriptors: {
          apmSystemIndices: {
            index: [
              {
                names: [APM_SOURCE_MAP_INDEX],
                privileges: indexLevelPrivileges,
                allow_restricted_indices: true,
              },
            ],
          },
        },
      },
    });

  logger.debug('Created source map API Key');

  return `${response.id}:${response.api_key}`;
}

export async function createApmAgentConfigApiKey({
  coreStart,
  logger,
  packagePolicyId,
}: {
  coreStart: CoreStart;
  logger: Logger;
  packagePolicyId: string;
}) {
  logger.debug('Creating agent configuration API Key');

  const response =
    await coreStart.elasticsearch.client.asInternalUser.security.createApiKey({
      body: {
        name: `Agent Configuration read access (Package policy: "${packagePolicyId}")`,
        metadata: {
          ...apiKeyMetadata,
          description:
            'Provides read access to the agent configurations index. Created for APM Server',
          package_policy_id: packagePolicyId,
          type: 'agent-configuration',
        },
        role_descriptors: {
          apmSystemIndices: {
            index: [
              {
                names: [APM_AGENT_CONFIGURATION_INDEX],
                privileges: indexLevelPrivileges,
                allow_restricted_indices: true,
              },
            ],
          },
        },
      },
    });

  logger.debug('Created agent configuration API Key');

  return `${response.id}:${response.api_key}`;
}
