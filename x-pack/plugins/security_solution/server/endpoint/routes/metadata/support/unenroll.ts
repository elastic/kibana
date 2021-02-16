/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, SavedObjectsClientContract } from 'kibana/server';
import { AgentService } from '../../../../../../fleet/server';
import { Agent } from '../../../../../../fleet/common/types/models';

export async function findAllUnenrolledAgentIds(
  agentService: AgentService,
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  pageSize: number = 1000
): Promise<string[]> {
  const searchOptions = (pageNum: number) => {
    return {
      page: pageNum,
      perPage: pageSize,
      showInactive: true,
      kuery:
        '(fleet-agents.active : false) OR (NOT fleet-agents.packages : "endpoint" AND fleet-agents.active : true)',
    };
  };

  let page = 1;

  const result: string[] = [];
  let hasMore = true;

  while (hasMore) {
    const unenrolledAgents = await agentService.listAgents(
      soClient,
      esClient,
      searchOptions(page++)
    );
    result.push(...unenrolledAgents.agents.map((agent: Agent) => agent.id));
    hasMore = unenrolledAgents.agents.length > 0;
  }
  return result;
}
