/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import { AgentService } from '../../../../../../ingest_manager/server';
import { Agent } from '../../../../../../ingest_manager/common/types/models';

export async function findAllUnenrolledAgentIds(
  agentService: AgentService,
  soClient: SavedObjectsClientContract,
  pageSize: number = 1000
): Promise<string[]> {
  const searchOptions = (pageNum: number) => {
    return {
      page: pageNum,
      perPage: pageSize,
      showInactive: true,
      kuery: 'fleet-agents.packages:endpoint AND fleet-agents.active:false',
    };
  };

  let page = 1;

  const result: string[] = [];
  let hasMore = true;

  while (hasMore) {
    const unenrolledAgents = await agentService.listAgents(soClient, searchOptions(page++));
    result.push(...unenrolledAgents.agents.map((agent: Agent) => agent.id));
    hasMore = unenrolledAgents.agents.length > 0;
  }
  return result;
}
