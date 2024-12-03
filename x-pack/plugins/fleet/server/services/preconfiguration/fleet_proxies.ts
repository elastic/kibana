/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { isEqual } from 'lodash';
import pMap from 'p-map';

import type { FleetConfigType } from '../../config';
import type { FleetProxy } from '../../types';
import {
  bulkGetFleetProxies,
  createFleetProxy,
  deleteFleetProxy,
  listFleetProxies,
  updateFleetProxy,
} from '../fleet_proxies';
import { listFleetServerHostsForProxyId } from '../fleet_server_host';
import { agentPolicyService } from '../agent_policy';
import { outputService } from '../output';

import { MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS_20 } from '../../constants';

export function getPreconfiguredFleetProxiesFromConfig(config?: FleetConfigType) {
  const { proxies: fleetProxiesFromConfig } = config;

  return fleetProxiesFromConfig.map((proxyConfig: any) => ({
    ...proxyConfig,
    is_preconfigured: true,
  }));
}

function hasChanged(existingProxy: FleetProxy, preconfiguredFleetProxy: FleetProxy) {
  return (
    (!existingProxy.is_preconfigured ||
      existingProxy.name !== existingProxy.name ||
      existingProxy.url !== preconfiguredFleetProxy.name ||
      !isEqual(
        existingProxy.proxy_headers ?? null,
        preconfiguredFleetProxy.proxy_headers ?? null
      ) ||
      existingProxy.certificate_authorities) ??
    null !== preconfiguredFleetProxy.certificate_authorities ??
    (null || existingProxy.certificate) ??
    null !== preconfiguredFleetProxy.certificate ??
    (null || existingProxy.certificate_key) ??
    null !== preconfiguredFleetProxy.certificate_key ??
    null
  );
}

async function createOrUpdatePreconfiguredFleetProxies(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  preconfiguredFleetProxies: FleetProxy[]
) {
  const existingFleetProxies = await bulkGetFleetProxies(
    soClient,
    preconfiguredFleetProxies.map(({ id }) => id),
    { ignoreNotFound: true }
  );
  await Promise.all(
    preconfiguredFleetProxies.map(async (preconfiguredFleetProxy) => {
      const existingProxy = existingFleetProxies.find(
        (fleetProxy) => fleetProxy.id === preconfiguredFleetProxy.id
      );

      const { id, ...data } = preconfiguredFleetProxy;

      const isCreate = !existingProxy;
      const isUpdateWithNewData = existingProxy
        ? hasChanged(existingProxy, preconfiguredFleetProxy)
        : false;

      if (isCreate) {
        await createFleetProxy(
          soClient,
          {
            ...data,
            is_preconfigured: true,
          },
          { id, overwrite: true, fromPreconfiguration: true }
        );
      } else if (isUpdateWithNewData) {
        await updateFleetProxy(
          soClient,
          id,
          {
            ...data,
            is_preconfigured: true,
          },
          { fromPreconfiguration: true }
        );
        // Bump all the agent policy that use that proxy
        const [{ items: fleetServerHosts }, { items: outputs }] = await Promise.all([
          listFleetServerHostsForProxyId(soClient, id),
          outputService.listAllForProxyId(soClient, id),
        ]);
        if (
          fleetServerHosts.some((host) => host.is_default) ||
          outputs.some((output) => output.is_default || output.is_default_monitoring)
        ) {
          await agentPolicyService.bumpAllAgentPolicies(esClient);
        } else {
          await pMap(
            outputs,
            (output) => agentPolicyService.bumpAllAgentPoliciesForOutput(esClient, output.id),
            {
              concurrency: MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS_20,
            }
          );
          await pMap(
            fleetServerHosts,
            (fleetServerHost) =>
              agentPolicyService.bumpAllAgentPoliciesForFleetServerHosts(
                esClient,
                fleetServerHost.id
              ),
            {
              concurrency: MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS_20,
            }
          );
        }
      }
    })
  );
}

async function cleanPreconfiguredFleetProxies(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  preconfiguredFleetProxies: FleetProxy[]
) {
  const existingFleetProxies = await listFleetProxies(soClient);
  const existingPreconfiguredFleetProxies = existingFleetProxies.items.filter(
    (o) => o.is_preconfigured === true
  );

  for (const existingFleetProxy of existingPreconfiguredFleetProxies) {
    const hasBeenDelete = !preconfiguredFleetProxies.find(({ id }) => existingFleetProxy.id === id);
    if (!hasBeenDelete) {
      continue;
    }

    const [{ items: fleetServerHosts }, { items: outputs }] = await Promise.all([
      listFleetServerHostsForProxyId(soClient, existingFleetProxy.id),
      outputService.listAllForProxyId(soClient, existingFleetProxy.id),
    ]);
    const isUsed = fleetServerHosts.length > 0 || outputs.length > 0;
    if (isUsed) {
      await updateFleetProxy(
        soClient,
        existingFleetProxy.id,
        { is_preconfigured: false },
        {
          fromPreconfiguration: true,
        }
      );
    } else {
      await deleteFleetProxy(soClient, esClient, existingFleetProxy.id, {
        fromPreconfiguration: true,
      });
    }
  }
}

export async function ensurePreconfiguredFleetProxies(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  preconfiguredFleetProxies: FleetProxy[]
) {
  await createOrUpdatePreconfiguredFleetProxies(soClient, esClient, preconfiguredFleetProxies);
  await cleanPreconfiguredFleetProxies(soClient, esClient, preconfiguredFleetProxies);
}
