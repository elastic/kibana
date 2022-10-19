/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client, estypes } from '@elastic/elasticsearch';
import { AGENTS_INDEX, EPM_API_ROUTES } from '@kbn/fleet-plugin/common';
import type { AgentStatus, GetPackagesResponse } from '@kbn/fleet-plugin/common';
import { pick } from 'lodash';
import { ToolingLog } from '@kbn/tooling-log';
import type { AxiosResponse } from 'axios';
import type { KbnClient } from '@kbn/test';
import { FleetAgentGenerator } from '../../../common/endpoint/data_generators/fleet_agent_generator';

const fleetGenerator = new FleetAgentGenerator();

export const checkInFleetAgent = async (
  esClient: Client,
  agentId: string,
  {
    agentStatus = 'online',
    log = new ToolingLog(),
  }: Partial<{
    /** The agent status to be sent. If set to `random`, then one will be randomly generated */
    agentStatus: AgentStatus | 'random';
    log: ToolingLog;
  }> = {}
): Promise<estypes.UpdateResponse> => {
  const fleetAgentStatus =
    agentStatus === 'random' ? fleetGenerator.randomAgentStatus() : agentStatus;

  const update = pick(fleetGenerator.generateEsHitWithStatus(fleetAgentStatus)._source, [
    'last_checkin_status',
    'last_checkin',
    'active',
    'unenrollment_started_at',
    'unenrolled_at',
    'upgrade_started_at',
    'upgraded_at',
  ]);

  // WORKAROUND: Endpoint API will exclude metadata for any fleet agent whose status is `inactive`,
  // which means once we update the Fleet agent with that status, the metadata api will no longer
  // return the endpoint host info.'s. So - we avoid that here.
  update.active = true;

  // Ensure any `undefined` value is set to `null` for the update
  Object.entries(update).forEach(([key, value]) => {
    if (value === undefined) {
      // @ts-expect-error TS7053 Element implicitly has an 'any' type
      update[key] = null;
    }
  });

  log.verbose(`update to fleet agent [${agentId}][${agentStatus} / ${fleetAgentStatus}]: `, update);

  return esClient.update({
    index: AGENTS_INDEX,
    id: agentId,
    refresh: 'wait_for',
    retry_on_conflict: 5,
    body: {
      doc: update,
    },
  });
};

export const fetchEndpointPackageInfo = async (
  kbnClient: KbnClient
): Promise<GetPackagesResponse['items'][number]> => {
  const endpointPackage = (
    (await kbnClient.request({
      path: `${EPM_API_ROUTES.LIST_PATTERN}?category=security`,
      method: 'GET',
    })) as AxiosResponse<GetPackagesResponse>
  ).data.items.find((epmPackage) => epmPackage.name === 'endpoint');

  if (!endpointPackage) {
    throw new Error('EPM Endpoint package was not found!');
  }

  return endpointPackage;
};
