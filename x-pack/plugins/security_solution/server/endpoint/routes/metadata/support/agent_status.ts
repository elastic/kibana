/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, SavedObjectsClientContract } from 'kibana/server';
import { AgentService } from '../../../../../../fleet/server';
import { AgentStatusKueryHelper } from '../../../../../../fleet/common/services';
import { Agent } from '../../../../../../fleet/common/types/models';
import { HostStatus } from '../../../../../common/endpoint/types';

const STATUS_QUERY_MAP = new Map([
  [HostStatus.HEALTHY.toString(), AgentStatusKueryHelper.buildKueryForOnlineAgents()],
  [HostStatus.OFFLINE.toString(), AgentStatusKueryHelper.buildKueryForOfflineAgents()],
  [HostStatus.UNHEALTHY.toString(), AgentStatusKueryHelper.buildKueryForErrorAgents()],
  [HostStatus.UPDATING.toString(), AgentStatusKueryHelper.buildKueryForUpdatingAgents()],
  [HostStatus.INACTIVE.toString(), AgentStatusKueryHelper.buildKueryForInactiveAgents()],
]);

export async function findAgentIDsByStatus(
  agentService: AgentService,
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  status: string[],
  pageSize: number = 1000
): Promise<string[]> {
  const helpers = status.map((s) => STATUS_QUERY_MAP.get(s));
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
    const agents = await agentService.listAgents(esClient, searchOptions(page++));
    result.push(...agents.agents.map((agent: Agent) => agent.id));
    hasMore = agents.agents.length > 0;
  }
  return result;
}
