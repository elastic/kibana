/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import { normalizeHostsForAgents } from '../../../common/services';
import type { FleetConfigType } from '../../config';
import { DEFAULT_FLEET_SERVER_HOST_ID } from '../../constants';

import { FleetError } from '../../errors';

import type { FleetServerHost } from '../../types';
import { appContextService } from '../app_context';
import {
  bulkGetFleetServerHosts,
  createFleetServerHost,
  deleteFleetServerHost,
  listFleetServerHosts,
  updateFleetServerHost,
  getDefaultFleetServerHost,
} from '../fleet_server_host';
import { agentPolicyService } from '../agent_policy';

import { isDifferent } from './utils';

export function getCloudFleetServersHosts() {
  const cloudSetup = appContextService.getCloud();
  if (
    cloudSetup &&
    !cloudSetup.isServerlessEnabled &&
    cloudSetup.isCloudEnabled &&
    cloudSetup.cloudHost
  ) {
    // Fleet Server url are formed like this `https://<deploymentId>.fleet.<host>
    return [
      `https://${cloudSetup.deploymentId}.fleet.${cloudSetup.cloudHost}${
        cloudSetup.cloudDefaultPort && cloudSetup.cloudDefaultPort !== '443'
          ? `:${cloudSetup.cloudDefaultPort}`
          : ''
      }`,
    ];
  }
}

export function getPreconfiguredFleetServerHostFromConfig(config?: FleetConfigType) {
  const { fleetServerHosts: fleetServerHostsFromConfig } = config;

  const legacyFleetServerHostsConfig = getConfigFleetServerHosts(config);

  const fleetServerHosts: FleetServerHost[] = (fleetServerHostsFromConfig || []).concat([
    ...(legacyFleetServerHostsConfig
      ? [
          {
            name: 'Default',
            is_default: true,
            id: DEFAULT_FLEET_SERVER_HOST_ID,
            host_urls: legacyFleetServerHostsConfig,
          },
        ]
      : []),
  ]);

  if (fleetServerHosts.filter((fleetServerHost) => fleetServerHost.is_default).length > 1) {
    throw new FleetError('Only one default Fleet Server host is allowed');
  }

  return fleetServerHosts;
}

export async function ensurePreconfiguredFleetServerHosts(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  preconfiguredFleetServerHosts: FleetServerHost[]
) {
  await createOrUpdatePreconfiguredFleetServerHosts(
    soClient,
    esClient,
    preconfiguredFleetServerHosts
  );
  await createCloudFleetServerHostIfNeeded(soClient);
  await cleanPreconfiguredFleetServerHosts(soClient, esClient, preconfiguredFleetServerHosts);
}

export async function createOrUpdatePreconfiguredFleetServerHosts(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  preconfiguredFleetServerHosts: FleetServerHost[]
) {
  const existingFleetServerHosts = await bulkGetFleetServerHosts(
    soClient,
    preconfiguredFleetServerHosts.map(({ id }) => id),
    { ignoreNotFound: true }
  );

  await Promise.all(
    preconfiguredFleetServerHosts.map(async (preconfiguredFleetServerHost) => {
      const existingHost = existingFleetServerHosts.find(
        (fleetServerHost) => fleetServerHost.id === preconfiguredFleetServerHost.id
      );

      const { id, ...data } = preconfiguredFleetServerHost;

      const isCreate = !existingHost;
      const isUpdateWithNewData =
        (existingHost &&
          (!existingHost.is_preconfigured ||
            existingHost.is_default !== preconfiguredFleetServerHost.is_default ||
            existingHost.name !== preconfiguredFleetServerHost.name ||
            isDifferent(existingHost.is_internal, preconfiguredFleetServerHost.is_internal) ||
            isDifferent(
              existingHost.host_urls.map(normalizeHostsForAgents),
              preconfiguredFleetServerHost.host_urls.map(normalizeHostsForAgents)
            ))) ||
        isDifferent(existingHost?.proxy_id, preconfiguredFleetServerHost.proxy_id);

      if (isCreate) {
        await createFleetServerHost(
          soClient,
          {
            ...data,
            is_preconfigured: true,
          },
          { id, overwrite: true, fromPreconfiguration: true }
        );
      } else if (isUpdateWithNewData) {
        await updateFleetServerHost(
          soClient,
          id,
          {
            ...data,
            is_preconfigured: true,
          },
          { fromPreconfiguration: true }
        );
        if (data.is_default) {
          await agentPolicyService.bumpAllAgentPolicies(esClient);
        } else {
          await agentPolicyService.bumpAllAgentPoliciesForFleetServerHosts(esClient, id);
        }
      }
    })
  );
}

export async function createCloudFleetServerHostIfNeeded(soClient: SavedObjectsClientContract) {
  const cloudServerHosts = getCloudFleetServersHosts();
  if (!cloudServerHosts || cloudServerHosts.length === 0) {
    return;
  }

  const defaultFleetServerHost = await getDefaultFleetServerHost(soClient);
  if (!defaultFleetServerHost) {
    await createFleetServerHost(
      soClient,
      {
        name: 'Default',
        is_default: true,
        host_urls: cloudServerHosts,
        is_preconfigured: false,
      },
      { id: DEFAULT_FLEET_SERVER_HOST_ID, overwrite: true, fromPreconfiguration: true }
    );
  }
}

export async function cleanPreconfiguredFleetServerHosts(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  preconfiguredFleetServerHosts: FleetServerHost[]
) {
  const existingFleetServerHosts = await listFleetServerHosts(soClient);
  const existingPreconfiguredHosts = existingFleetServerHosts.items.filter(
    (o) => o.is_preconfigured === true
  );

  for (const existingFleetServerHost of existingPreconfiguredHosts) {
    const hasBeenDelete = !preconfiguredFleetServerHosts.find(
      ({ id }) => existingFleetServerHost.id === id
    );
    if (!hasBeenDelete) {
      continue;
    }

    if (existingFleetServerHost.is_default) {
      await updateFleetServerHost(
        soClient,
        existingFleetServerHost.id,
        { is_preconfigured: false },
        {
          fromPreconfiguration: true,
        }
      );
    } else {
      await deleteFleetServerHost(soClient, esClient, existingFleetServerHost.id, {
        fromPreconfiguration: true,
      });
    }
  }
}

function getConfigFleetServerHosts(config?: FleetConfigType) {
  return config?.agents?.fleet_server?.hosts && config.agents.fleet_server.hosts.length > 0
    ? config?.agents?.fleet_server?.hosts
    : undefined;
}
