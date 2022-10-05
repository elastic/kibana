/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { isEqual } from 'lodash';

import type { FleetConfigType } from '../../config';
import { DEFAULT_FLEET_SERVER_HOST_ID } from '../../constants';

import type { FleetServerHost } from '../../types';
import {
  bulkGetFleetServerHosts,
  createFleetServerHost,
  deleteFleetServerHost,
  listFleetServerHosts,
  updateFleetServerHost,
} from '../fleet_server_host';

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
    throw new Error('Only one default Fleet Server host is allowed');
  }

  return fleetServerHosts;
}

export async function ensurePreconfiguredFleetServerHosts(
  soClient: SavedObjectsClientContract,
  preconfiguredFleetServerHosts: FleetServerHost[]
) {
  await createOrUpdatePreconfiguredFleetServerHosts(soClient, preconfiguredFleetServerHosts);
  await cleanPreconfiguredFleetServerHosts(soClient, preconfiguredFleetServerHosts);
}

export async function createOrUpdatePreconfiguredFleetServerHosts(
  soClient: SavedObjectsClientContract,
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
        existingHost &&
        (!existingHost.is_preconfigured ||
          existingHost.is_default !== preconfiguredFleetServerHost.is_default ||
          existingHost.name !== preconfiguredFleetServerHost.name ||
          !isEqual(existingHost?.host_urls, preconfiguredFleetServerHost.host_urls));

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
        // TODO Bump revision of all policies using that output
      }
    })
  );
}

export async function cleanPreconfiguredFleetServerHosts(
  soClient: SavedObjectsClientContract,
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
      await deleteFleetServerHost(soClient, existingFleetServerHost.id, {
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
