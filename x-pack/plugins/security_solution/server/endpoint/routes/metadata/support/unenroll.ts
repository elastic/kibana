/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, SavedObjectsClientContract } from 'kibana/server';
import { AgentService, PackagePolicyServiceInterface } from '../../../../../../fleet/server';
import { Agent } from '../../../../../../fleet/common/types/models';

const getAllAgentPolicyIdsWithEndpoint = async (
  packagePolicyService: PackagePolicyServiceInterface,
  soClient: SavedObjectsClientContract
): Promise<string[]> => {
  const result: string[] = [];
  const perPage = 1000;
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const endpointPoliciesResponse = await packagePolicyService.list(soClient, {
      perPage,
      page: page++,
      kuery: 'ingest-package-policies.package.name:endpoint',
    });
    if (endpointPoliciesResponse.items.length > 0) {
      result.push(
        ...endpointPoliciesResponse.items.map((endpointPolicy) => endpointPolicy.policy_id)
      );
    } else {
      hasMore = false;
    }
  }

  return result;
};

export async function findAllUnenrolledAgentIds(
  agentService: AgentService,
  packagePolicyService: PackagePolicyServiceInterface,
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  pageSize: number = 1000
): Promise<string[]> {
  const agentPoliciesWithEndpoint = await getAllAgentPolicyIdsWithEndpoint(
    packagePolicyService,
    soClient
  );
  const includeAgentPolicyFilter = agentPoliciesWithEndpoint.length > 0;
  const policyIdString = `"${agentPoliciesWithEndpoint.join('" OR "')}"`;

  const searchOptions = (pageNum: number) => {
    // We want:
    // 1.   agents that are not active
    // 2a.  if we have a list of agent policies, then Agents that are Active and that are
    //      NOT enrolled with an Agent Policy that has endpoint
    // 2b.  If we don't have a list of agent policies, then we don't want any active agent at all
    const kuery = `(active : false) OR (active: true${
      includeAgentPolicyFilter ? ` AND NOT policy_id:(${policyIdString}` : ''
    } ))`;

    return {
      page: pageNum,
      perPage: pageSize,
      showInactive: true,
      kuery,
    };
  };

  let page = 1;

  const result: string[] = [];
  let hasMore = true;

  while (hasMore) {
    const unenrolledAgents = await agentService.listAgents(esClient, searchOptions(page++));
    result.push(...unenrolledAgents.agents.map((agent: Agent) => agent.id));
    hasMore = unenrolledAgents.agents.length > 0;
  }
  return result;
}
