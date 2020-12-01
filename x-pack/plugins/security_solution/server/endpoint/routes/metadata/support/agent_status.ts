/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import { AgentService } from '../../../../../../fleet/server';
import { AgentStatusKueryHelper } from '../../../../../../fleet/common/services';
import { Agent } from '../../../../../../fleet/common/types/models';
import { HostStatus } from '../../../../../common/endpoint/types';

const STATUS_QUERY_MAP = new Map([
  [HostStatus.ONLINE.toString(), AgentStatusKueryHelper.buildKueryForOnlineAgents()],
  [HostStatus.OFFLINE.toString(), AgentStatusKueryHelper.buildKueryForOfflineAgents()],
  [HostStatus.ERROR.toString(), AgentStatusKueryHelper.buildKueryForErrorAgents()],
  [HostStatus.UNENROLLING.toString(), AgentStatusKueryHelper.buildKueryForUnenrollingAgents()],
]);

export async function findAgentIDsByStatus(
  agentService: AgentService,
  soClient: SavedObjectsClientContract,
  status: string[],
  pageSize: number = 1000
): Promise<string[]> {
  const helpers = status.map((s) => STATUS_QUERY_MAP.get(s));
  const searchOptions = (pageNum: number) => {
    return {
      page: pageNum,
      perPage: pageSize,
      showInactive: true,
      kuery: `(fleet-agents.packages : "endpoint" AND (${helpers.join(' OR ')}))`,
    };
  };

  let page = 1;

  const result: string[] = [];
  let hasMore = true;

  while (hasMore) {
    const agents = await agentService.listAgents(soClient, searchOptions(page++));
    result.push(...agents.agents.map((agent: Agent) => agent.id));
    hasMore = agents.agents.length > 0;
  }
  return result;
}
