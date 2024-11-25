/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { uniq } from 'lodash';

import type { AgentPolicy } from '../../types';
import { outputService } from '../output';

import { getSourceUriForAgentPolicy } from '../../routes/agent/source_uri_utils';

import { getFleetServerHostsForAgentPolicy } from '../fleet_server_host';
import { appContextService } from '../app_context';
import { bulkGetFleetProxies } from '../fleet_proxies';
import { OutputNotFoundError } from '../../errors';

export async function fetchRelatedSavedObjects(
  soClient: SavedObjectsClientContract,
  agentPolicy: AgentPolicy
) {
  const [defaultDataOutputId, defaultMonitoringOutputId] = await Promise.all([
    outputService.getDefaultDataOutputId(soClient),
    outputService.getDefaultMonitoringOutputId(soClient),
  ]);

  if (!defaultDataOutputId) {
    throw new OutputNotFoundError('Default output is not setup');
  }

  const dataOutputId = agentPolicy.data_output_id || defaultDataOutputId;
  const monitoringOutputId =
    agentPolicy.monitoring_output_id || defaultMonitoringOutputId || dataOutputId;

  const outputIds = uniq([
    dataOutputId,
    monitoringOutputId,
    ...(agentPolicy.package_policies || []).reduce((acc: string[], packagePolicy) => {
      if (packagePolicy.output_id) {
        acc.push(packagePolicy.output_id);
      }
      return acc;
    }, []),
  ]);

  const [outputs, { host: downloadSourceUri, proxy_id: downloadSourceProxyId }, fleetServerHosts] =
    await Promise.all([
      outputService.bulkGet(outputIds, { ignoreNotFound: true }),
      getSourceUriForAgentPolicy(soClient, agentPolicy),
      getFleetServerHostsForAgentPolicy(soClient, agentPolicy).catch((err) => {
        appContextService
          .getLogger()
          ?.warn(`Unable to get fleet server hosts for policy ${agentPolicy?.id}: ${err.message}`);

        return;
      }),
    ]);

  const dataOutput = outputs.find((output) => output.id === dataOutputId);
  if (!dataOutput) {
    throw new OutputNotFoundError(`Data output not found ${dataOutputId}`);
  }
  const monitoringOutput = outputs.find((output) => output.id === monitoringOutputId);
  if (!monitoringOutput) {
    throw new OutputNotFoundError(`Monitoring output not found ${monitoringOutputId}`);
  }

  const proxyIds = uniq(
    outputs
      .flatMap((output) => output.proxy_id)
      .filter((proxyId): proxyId is string => typeof proxyId !== 'undefined' && proxyId !== null)
      .concat(fleetServerHosts?.proxy_id ? [fleetServerHosts.proxy_id] : [])
      .concat(downloadSourceProxyId ? [downloadSourceProxyId] : [])
  );

  const proxies = proxyIds.length ? await bulkGetFleetProxies(soClient, proxyIds) : [];

  let downloadSourceProxyUri: string | null = null;

  if (downloadSourceProxyId) {
    const downloadSourceProxy = proxies.find((proxy) => proxy.id === downloadSourceProxyId);
    if (downloadSourceProxy) {
      downloadSourceProxyUri = downloadSourceProxy.url;
    }
  }

  return {
    outputs,
    proxies,
    dataOutput,
    monitoringOutput,
    downloadSourceUri,
    downloadSourceProxyUri,
    fleetServerHosts,
  };
}
