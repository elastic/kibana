/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';

import { FLEET_PROXY_SAVED_OBJECT_TYPE, SO_SEARCH_LIMIT } from '../constants';
import { FleetProxyUnauthorizedError } from '../errors';
import { FleetProxy, FleetProxySOAttributes, NewFleetProxy } from '../types';

export async function listFleetProxies(soClient: SavedObjectsClientContract) {
  const res = await soClient.find<FleetProxySOAttributes>({
    type: FLEET_PROXY_SAVED_OBJECT_TYPE,
    perPage: SO_SEARCH_LIMIT,
  });

  return {
    items: res.saved_objects.map<FleetProxy>((so) => ({
      id: so.id,
      ...so.attributes,
    })),
    total: res.total,
    page: res.page,
    perPage: res.per_page,
  };
}

export async function createFleetProxy(
  soClient: SavedObjectsClientContract,
  data: NewFleetProxy,
  options?: { id?: string; overwrite?: boolean; fromPreconfiguration?: boolean }
): Promise<FleetProxy> {
  const res = await soClient.create<FleetProxySOAttributes>(FLEET_PROXY_SAVED_OBJECT_TYPE, data, {
    id: options?.id,
    overwrite: options?.overwrite,
  });

  return {
    id: res.id,
    ...res.attributes,
  };
}

export async function getFleetProxy(
  soClient: SavedObjectsClientContract,
  id: string
): Promise<FleetProxy> {
  const res = await soClient.get<FleetProxySOAttributes>(FLEET_PROXY_SAVED_OBJECT_TYPE, id);

  return {
    id: res.id,
    ...res.attributes,
  };
}

export async function deleteFleetProxy(
  soClient: SavedObjectsClientContract,
  id: string,
  options?: { fromPreconfiguration?: boolean }
) {
  const fleetServerHost = await getFleetProxy(soClient, id);

  if (fleetServerHost.is_preconfigured && !options?.fromPreconfiguration) {
    throw new FleetProxyUnauthorizedError(`Cannot delete ${id} preconfigured proxy`);
  }

  // TODO remove from all outputs and fleet server
  // await agentPolicyService.removeFleetServerHostFromAll(soClient, esClient, id);

  return await soClient.delete(FLEET_PROXY_SAVED_OBJECT_TYPE, id);
}

export async function updateFleetProxy(
  soClient: SavedObjectsClientContract,
  id: string,
  data: Partial<FleetProxy>,
  options?: { fromPreconfiguration?: boolean }
) {
  const originalItem = await getFleetProxy(soClient, id);

  if (data.is_preconfigured && !options?.fromPreconfiguration) {
    throw new FleetProxyUnauthorizedError(`Cannot update ${id} preconfigured proxy`);
  }

  await soClient.update<FleetProxySOAttributes>(FLEET_PROXY_SAVED_OBJECT_TYPE, id, data);

  return {
    ...originalItem,
    ...data,
  };
}
