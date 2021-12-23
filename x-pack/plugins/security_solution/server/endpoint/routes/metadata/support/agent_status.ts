/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentClient } from '../../../../../../fleet/server';
import { AgentStatusKueryHelper } from '../../../../../../fleet/common/services';
import { Agent } from '../../../../../../fleet/common/types/models';
import { HostStatus } from '../../../../../common/endpoint/types';

const getStatusQueryMap = (path: string = '') =>
  new Map([
    [HostStatus.HEALTHY.toString(), AgentStatusKueryHelper.buildKueryForOnlineAgents(path)],
    [HostStatus.OFFLINE.toString(), AgentStatusKueryHelper.buildKueryForOfflineAgents(path)],
    [HostStatus.UNHEALTHY.toString(), AgentStatusKueryHelper.buildKueryForErrorAgents(path)],
    [HostStatus.UPDATING.toString(), AgentStatusKueryHelper.buildKueryForUpdatingAgents(path)],
    [HostStatus.INACTIVE.toString(), AgentStatusKueryHelper.buildKueryForInactiveAgents(path)],
  ]);

export function buildStatusesKuery(statusesToFilter: string[]): string | undefined {
  if (!statusesToFilter.length) {
    return;
  }
  const STATUS_QUERY_MAP = getStatusQueryMap('united.agent.');
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
  const STATUS_QUERY_MAP = getStatusQueryMap();
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
