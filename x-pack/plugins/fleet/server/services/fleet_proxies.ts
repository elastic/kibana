/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, SavedObject } from '@kbn/core/server';

import { FLEET_PROXY_SAVED_OBJECT_TYPE, SO_SEARCH_LIMIT } from '../constants';
import { FleetProxyUnauthorizedError } from '../errors';
import type { FleetProxy, FleetProxySOAttributes, NewFleetProxy } from '../types';

function savedObjectToFleetProxy(so: SavedObject<FleetProxySOAttributes>): FleetProxy {
  const { proxy_headers: proxyHeaders, ...rest } = so.attributes;

  return {
    id: so.id,
    proxy_headers: proxyHeaders && proxyHeaders !== '' ? JSON.parse(proxyHeaders) : undefined,
    ...rest,
  };
}

function fleetProxyDataToSOAttribute(data: NewFleetProxy): FleetProxySOAttributes;
function fleetProxyDataToSOAttribute(data: Partial<NewFleetProxy>): Partial<FleetProxySOAttributes>;
function fleetProxyDataToSOAttribute(
  data: Partial<NewFleetProxy> | NewFleetProxy
): Partial<FleetProxySOAttributes> | Partial<FleetProxySOAttributes> {
  const { proxy_headers: proxyHeaders, ...rest } = data;

  return {
    proxy_headers: proxyHeaders ? JSON.stringify(proxyHeaders) : null,
    ...rest,
  };
}

export async function listFleetProxies(soClient: SavedObjectsClientContract) {
  const res = await soClient.find<FleetProxySOAttributes>({
    type: FLEET_PROXY_SAVED_OBJECT_TYPE,
    perPage: SO_SEARCH_LIMIT,
  });

  return {
    items: res.saved_objects.map<FleetProxy>(savedObjectToFleetProxy),
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
  const res = await soClient.create<FleetProxySOAttributes>(
    FLEET_PROXY_SAVED_OBJECT_TYPE,
    fleetProxyDataToSOAttribute(data),
    {
      id: options?.id,
      overwrite: options?.overwrite,
    }
  );

  return savedObjectToFleetProxy(res);
}

export async function getFleetProxy(
  soClient: SavedObjectsClientContract,
  id: string
): Promise<FleetProxy> {
  const res = await soClient.get<FleetProxySOAttributes>(FLEET_PROXY_SAVED_OBJECT_TYPE, id);

  return savedObjectToFleetProxy(res);
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

  await soClient.update<FleetProxySOAttributes>(
    FLEET_PROXY_SAVED_OBJECT_TYPE,
    id,
    fleetProxyDataToSOAttribute(data)
  );

  return {
    ...originalItem,
    ...data,
  };
}

export async function bulkGetFleetProxies(
  soClient: SavedObjectsClientContract,
  ids: string[],
  { ignoreNotFound = false } = { ignoreNotFound: true }
) {
  if (ids.length === 0) {
    return [];
  }

  const res = await soClient.bulkGet<FleetProxySOAttributes>(
    ids.map((id) => ({
      id,
      type: FLEET_PROXY_SAVED_OBJECT_TYPE,
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

      return savedObjectToFleetProxy(so);
    })
    .filter(
      (fleetProxyOrUndefined): fleetProxyOrUndefined is FleetProxy =>
        typeof fleetProxyOrUndefined !== 'undefined'
    );
}
