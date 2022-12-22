/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentClient } from '@kbn/fleet-plugin/server';
import { AgentStatusKueryHelper } from '@kbn/fleet-plugin/common/services';
import type { Agent } from '@kbn/fleet-plugin/common/types/models';
import { HostStatus } from '../../../../../common/endpoint/types';

const STATUS_QUERY_MAP = new Map([
  [HostStatus.HEALTHY.toString(), AgentStatusKueryHelper.buildKueryForOnlineAgents()],
  [HostStatus.OFFLINE.toString(), AgentStatusKueryHelper.buildKueryForOfflineAgents()],
  [HostStatus.UNHEALTHY.toString(), AgentStatusKueryHelper.buildKueryForErrorAgents()],
  [HostStatus.UPDATING.toString(), AgentStatusKueryHelper.buildKueryForUpdatingAgents()],
  [HostStatus.INACTIVE.toString(), AgentStatusKueryHelper.buildKueryForInactiveAgents()],
  [HostStatus.UNENROLLED.toString(), AgentStatusKueryHelper.buildKueryForUnenrolledAgents()],
]);

export function buildStatusesKuery(statusesToFilter: string[]): string | undefined {
  if (!statusesToFilter.length) {
    return;
  }
  const statusQueries = statusesToFilter.map((status) => STATUS_QUERY_MAP.get(status));
  if (!statusQueries.length) {
    return;
  }

  return `(${statusQueries.join(' OR ')})`;
}

export async function findAgentIdsByStatus(
  agentClient: AgentClient,
  statuses: string[],
  pageSize: number = 1000
): Promise<string[]> {
  if (!statuses.length) {
    return [];
  }
  const helpers = statuses.map((s) => STATUS_QUERY_MAP.get(s));
  const searchOptions = (pageNum: number) => {
    return {
      page: pageNum,
      perPage: pageSize,
      showInactive: true,
      kuery: `(packages : "endpoint" AND (${helpers.join(' OR ')}))`,
    };
  };

  let page = 1;

  const result: string[] = [];
  let hasMore = true;

  while (hasMore) {
    const agents = await agentClient.listAgents(searchOptions(page++));
    result.push(...agents.agents.map((agent: Agent) => agent.id));
    hasMore = agents.agents.length > 0;
  }
  return result;
}
