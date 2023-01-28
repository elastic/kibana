/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client, estypes } from '@elastic/elasticsearch';
import { AGENT_API_ROUTES, AGENTS_INDEX } from '@kbn/fleet-plugin/common';
import type { AgentStatus, GetAgentsResponse } from '@kbn/fleet-plugin/common';
import { pick } from 'lodash';
import { ToolingLog } from '@kbn/tooling-log';
import type { GetAgentsRequest } from '@kbn/fleet-plugin/common/types';
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

/**
 * Query Fleet Agents API
 *
 * @param kbnClient
 * @param options
 */
export const fetchFleetAgents = async (
  kbnClient: KbnClient,
  options: GetAgentsRequest['query']
): Promise<GetAgentsResponse> => {
  return kbnClient
    .request<GetAgentsResponse>({
      method: 'GET',
      path: AGENT_API_ROUTES.LIST_PATTERN,
      query: options,
    })
    .then((response) => response.data);
};

/**
 * Will keep querying Fleet list of agents until the given `hostname` shows up as healthy
 *
 * @param kbnClient
 * @param hostname
 * @param timeoutMs
 */
export const waitForHostToEnroll = async (
  kbnClient: KbnClient,
  hostname: string,
  timeoutMs: number = 15000
): Promise<void> => {
  const started = new Date();
  const hasTimedOut = (): boolean => {
    const elapsedTime = Date.now() - started.getTime();
    return elapsedTime > timeoutMs;
  };
  let found = false;

  while (!found && !hasTimedOut()) {
    const hostAgent = await fetchFleetAgents(kbnClient, {
      perPage: 1,
      kuery: `(local_metadata.host.hostname.keyword : "${hostname}") and (status:online)`,
      showInactive: false,
    }).then((response) => response.items[0]);

    if (hostAgent) {
      found = true;
    } else {
      // sleep and check again
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
};
