/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentPolicyInfo } from '../../../../common/types';
import { SyntheticsServerSetup } from '../../../types';
import { SyntheticsRestApiRouteFactory } from '../../types';
import { SYNTHETICS_API_URLS } from '../../../../common/constants';

export const getAgentPoliciesRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.AGENT_POLICIES,
  validate: {},
  handler: async ({ server }): Promise<AgentPolicyInfo[]> => {
    return getAgentPoliciesAsInternalUser({ server, withAgentCount: true });
  },
});

export const getAgentPoliciesAsInternalUser = async ({
  server,
  withAgentCount = false,
}: {
  server: SyntheticsServerSetup;
  withAgentCount?: boolean;
}) => {
  const soClient = server.coreStart.savedObjects.createInternalRepository();
  const esClient = server.coreStart.elasticsearch.client.asInternalUser;

  const agentPolicies = await server.fleet?.agentPolicyService.list(soClient, {
    page: 1,
    perPage: 10000,
    sortField: 'name',
    sortOrder: 'asc',
    kuery: 'ingest-agent-policies.is_managed : false',
    esClient,
    withAgentCount,
  });

  return agentPolicies.items.map((agentPolicy) => ({
    id: agentPolicy.id,
    name: agentPolicy.name,
    agents: agentPolicy.agents ?? 0,
    status: agentPolicy.status,
    description: agentPolicy.description,
    namespace: agentPolicy.namespace,
  }));
};
