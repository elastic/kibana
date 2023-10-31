/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  SavedObjectsClientContract,
  SavedObject,
} from '@kbn/core/server';

import { normalizeHostsForAgents } from '../../common/services';
import {
  GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
  FLEET_SERVER_HOST_SAVED_OBJECT_TYPE,
  DEFAULT_FLEET_SERVER_HOST_ID,
  SO_SEARCH_LIMIT,
} from '../constants';

import type {
  SettingsSOAttributes,
  FleetServerHostSOAttributes,
  FleetServerHost,
  NewFleetServerHost,
  AgentPolicy,
} from '../types';
import { FleetServerHostUnauthorizedError } from '../errors';

import { agentPolicyService } from './agent_policy';
import { escapeSearchQueryPhrase } from './saved_object';

function savedObjectToFleetServerHost(so: SavedObject<FleetServerHostSOAttributes>) {
  const data = { ...so.attributes };

  if (data.proxy_id === null) {
    delete data.proxy_id;
  }

  return { id: so.id, ...data };
}

export async function createFleetServerHost(
  soClient: SavedObjectsClientContract,
  data: NewFleetServerHost,
  options?: { id?: string; overwrite?: boolean; fromPreconfiguration?: boolean }
): Promise<FleetServerHost> {
  if (data.is_default) {
    const defaultItem = await getDefaultFleetServerHost(soClient);
    if (defaultItem && defaultItem.id !== options?.id) {
      await updateFleetServerHost(
        soClient,
        defaultItem.id,
        { is_default: false },
        { fromPreconfiguration: options?.fromPreconfiguration }
      );
    }
  }

  if (data.host_urls) {
    data.host_urls = data.host_urls.map(normalizeHostsForAgents);
  }

  const res = await soClient.create<FleetServerHostSOAttributes>(
    FLEET_SERVER_HOST_SAVED_OBJECT_TYPE,
    data,
    { id: options?.id, overwrite: options?.overwrite }
  );

  return savedObjectToFleetServerHost(res);
}

export async function getFleetServerHost(
  soClient: SavedObjectsClientContract,
  id: string
): Promise<FleetServerHost> {
  const res = await soClient.get<FleetServerHostSOAttributes>(
    FLEET_SERVER_HOST_SAVED_OBJECT_TYPE,
    id
  );

  return savedObjectToFleetServerHost(res);
}

export async function listFleetServerHosts(soClient: SavedObjectsClientContract) {
  const res = await soClient.find<FleetServerHostSOAttributes>({
    type: FLEET_SERVER_HOST_SAVED_OBJECT_TYPE,
    perPage: SO_SEARCH_LIMIT,
  });

  return {
    items: res.saved_objects.map<FleetServerHost>(savedObjectToFleetServerHost),
    total: res.total,
    page: res.page,
    perPage: res.per_page,
  };
}

export async function listFleetServerHostsForProxyId(
  soClient: SavedObjectsClientContract,
  proxyId: string
) {
  const res = await soClient.find<FleetServerHostSOAttributes>({
    type: FLEET_SERVER_HOST_SAVED_OBJECT_TYPE,
    perPage: SO_SEARCH_LIMIT,
    searchFields: ['proxy_id'],
    search: escapeSearchQueryPhrase(proxyId),
  });

  return {
    items: res.saved_objects.map<FleetServerHost>(savedObjectToFleetServerHost),
    total: res.total,
    page: res.page,
    perPage: res.per_page,
  };
}

export async function deleteFleetServerHost(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  id: string,
  options?: { fromPreconfiguration?: boolean }
) {
  const fleetServerHost = await getFleetServerHost(soClient, id);

  if (fleetServerHost.is_preconfigured && !options?.fromPreconfiguration) {
    throw new FleetServerHostUnauthorizedError(
      `Cannot delete ${id} preconfigured fleet server host`
    );
  }

  if (fleetServerHost.is_default) {
    throw new FleetServerHostUnauthorizedError(
      `Default Fleet Server hosts ${id} cannot be deleted.`
    );
  }

  await agentPolicyService.removeFleetServerHostFromAll(soClient, esClient, id);

  return await soClient.delete(FLEET_SERVER_HOST_SAVED_OBJECT_TYPE, id);
}

export async function updateFleetServerHost(
  soClient: SavedObjectsClientContract,
  id: string,
  data: Partial<FleetServerHost>,
  options?: { fromPreconfiguration?: boolean }
) {
  const originalItem = await getFleetServerHost(soClient, id);

  if (data.is_preconfigured && !options?.fromPreconfiguration) {
    throw new FleetServerHostUnauthorizedError(
      `Cannot update ${id} preconfigured fleet server host`
    );
  }

  if (data.is_default) {
    const defaultItem = await getDefaultFleetServerHost(soClient);
    if (defaultItem && defaultItem.id !== id) {
      await updateFleetServerHost(
        soClient,
        defaultItem.id,
        {
          is_default: false,
        },
        { fromPreconfiguration: options?.fromPreconfiguration }
      );
    }
  }

  if (data.host_urls) {
    data.host_urls = data.host_urls.map(normalizeHostsForAgents);
  }

  await soClient.update<FleetServerHostSOAttributes>(FLEET_SERVER_HOST_SAVED_OBJECT_TYPE, id, data);

  return {
    ...originalItem,
    ...data,
  };
}

export async function bulkGetFleetServerHosts(
  soClient: SavedObjectsClientContract,
  ids: string[],
  { ignoreNotFound = false } = { ignoreNotFound: true }
) {
  if (ids.length === 0) {
    return [];
  }

  const res = await soClient.bulkGet<FleetServerHostSOAttributes>(
    ids.map((id) => ({
      id,
      type: FLEET_SERVER_HOST_SAVED_OBJECT_TYPE,
    }))
  );

  return res.saved_objects
    .map((so) => {
      if (so.error) {
        if (!ignoreNotFound || so.error.statusCode !== 404) {
          throw so.error;
        }
        return undefined;
      }

      return savedObjectToFleetServerHost(so);
    })
    .filter(
      (fleetServerHostOrUndefined): fleetServerHostOrUndefined is FleetServerHost =>
        typeof fleetServerHostOrUndefined !== 'undefined'
    );
}

export async function getFleetServerHostsForAgentPolicy(
  soClient: SavedObjectsClientContract,
  agentPolicy: AgentPolicy
) {
  if (agentPolicy.fleet_server_host_id) {
    return getFleetServerHost(soClient, agentPolicy.fleet_server_host_id);
  }

  const defaultFleetServerHost = await getDefaultFleetServerHost(soClient);
  if (!defaultFleetServerHost) {
    throw new Error('Default Fleet Server host is not setup');
  }

  return defaultFleetServerHost;
}

/**
 * Get the default Fleet server policy hosts or throw if it does not exists
 */
export async function getDefaultFleetServerHost(
  soClient: SavedObjectsClientContract
): Promise<FleetServerHost | null> {
  const res = await soClient.find<FleetServerHostSOAttributes>({
    type: FLEET_SERVER_HOST_SAVED_OBJECT_TYPE,
    filter: `${FLEET_SERVER_HOST_SAVED_OBJECT_TYPE}.attributes.is_default:true`,
  });

  if (res.saved_objects.length === 0) {
    return null;
  }

  return savedObjectToFleetServerHost(res.saved_objects[0]);
}

/**
 * Migrate Global setting fleet server hosts to their own saved object
 */
export async function migrateSettingsToFleetServerHost(soClient: SavedObjectsClientContract) {
  const defaultFleetServerHost = await getDefaultFleetServerHost(soClient);
  if (defaultFleetServerHost) {
    return;
  }

  const res = await soClient.find<SettingsSOAttributes>({
    type: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
  });

  const oldSettings = res.saved_objects[0];
  if (
    !oldSettings ||
    !oldSettings.attributes.fleet_server_hosts ||
    oldSettings.attributes.fleet_server_hosts.length === 0
  ) {
    return;
  }

  // Migrate
  await createFleetServerHost(
    soClient,
    {
      name: 'Default',
      host_urls: oldSettings.attributes.fleet_server_hosts,
      is_default: true,
      is_preconfigured: false,
    },
    {
      id: DEFAULT_FLEET_SERVER_HOST_ID,
      overwrite: true,
    }
  );
}
