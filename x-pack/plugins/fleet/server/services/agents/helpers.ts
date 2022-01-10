/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { SearchHit } from '../../../../../../src/core/types/elasticsearch';
import type { Agent, AgentSOAttributes, FleetServerAgent } from '../../types';
import { getAgentStatus } from '../../../common/services/agent_status';

type FleetServerAgentESResponse =
  | estypes.GetGetResult<FleetServerAgent>
  | estypes.SearchResponse<FleetServerAgent>['hits']['hits'][0]
  | SearchHit<FleetServerAgent>;

export function searchHitToAgent(hit: FleetServerAgentESResponse): Agent {
  // @ts-expect-error @elastic/elasticsearch MultiGetHit._source is optional
  const agent: Agent = {
    id: hit._id,
    ...hit._source,
    policy_revision: hit._source?.policy_revision_idx,
    access_api_key: undefined,
    status: undefined,
    packages: hit._source?.packages ?? [],
  };

  agent.status = getAgentStatus(agent);
  return agent;
}

export function agentSOAttributesToFleetServerAgentDoc(
  data: Partial<AgentSOAttributes>
): Partial<Omit<FleetServerAgent, 'id'>> {
  const { policy_revision: policyRevison, ...rest } = data;

  const doc: Partial<Omit<FleetServerAgent, 'id'>> = { ...rest };

  if (policyRevison !== undefined) {
    doc.policy_revision_idx = policyRevison;
  }

  if (!doc.updated_at) {
    doc.updated_at = new Date().toISOString();
  }

  return doc;
}
