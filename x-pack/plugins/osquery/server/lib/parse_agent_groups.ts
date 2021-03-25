/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from 'src/core/server';
import { OsqueryAppContext } from './osquery_app_context_services';

export interface AgentSelection {
  agents: string[];
  allAgentsSelected: boolean;
  platformsSelected: string[];
  policiesSelected: string[];
}

export const parseAgentSelection = async (
  esClient: ElasticsearchClient,
  context: OsqueryAppContext,
  agentSelection: AgentSelection
) => {
  let selectedAgents: string[] = [];
  const { allAgentsSelected, platformsSelected, policiesSelected, agents } = agentSelection;
  const agentService = context.service.getAgentService();
  if (agentService) {
    if (allAgentsSelected) {
      // TODO: actually fetch all the agents
      const { agents: fetchedAgents } = await agentService.listAgents(esClient, {
        perPage: 9000,
        showInactive: true,
      });
      selectedAgents.push(...fetchedAgents.map((a) => a.id));
    } else {
      if (platformsSelected.length > 0 || policiesSelected.length > 0) {
        const kueryFragments = [];
        if (platformsSelected.length) {
          kueryFragments.push(
            ...platformsSelected.map((platform) => `local_metadata.os.platform:${platform}`)
          );
        }
        if (policiesSelected.length) {
          kueryFragments.push(...policiesSelected.map((policy) => `policy_id:${policy}`));
        }
        const kuery = kueryFragments.join(' or ');
        // TODO: actually fetch all the agents
        const { agents: fetchedAgents } = await agentService.listAgents(esClient, {
          kuery,
          perPage: 9000,
          showInactive: true,
        });
        selectedAgents.push(...fetchedAgents.map((a) => a.id));
      }
      selectedAgents.push(...agents);
      selectedAgents = Array.from(new Set(selectedAgents));
    }
  }
  return selectedAgents;
};
