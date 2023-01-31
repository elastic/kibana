/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { SearchHit } from '@kbn/es-types';

import { appContextService } from '..';

import type { Agent, AgentSOAttributes, AgentStatus, FleetServerAgent } from '../../types';

type FleetServerAgentESResponse =
  | estypes.GetGetResult<FleetServerAgent>
  | estypes.SearchResponse<FleetServerAgent>['hits']['hits'][0]
  | SearchHit<FleetServerAgent>;

export function searchHitToAgent(
  hit: FleetServerAgentESResponse & {
    sort?: SortResults;
    fields?: { status?: AgentStatus[] };
  }
): Agent {
  // @ts-expect-error @elastic/elasticsearch MultiGetHit._source is optional
  const agent: Agent = {
    id: hit._id,
    ...hit._source,
    policy_revision: hit._source?.policy_revision_idx,
    access_api_key: undefined,
    status: undefined,
    packages: hit._source?.packages ?? [],
    sort: hit.sort,
  };

  if (!hit.fields?.status?.length) {
    appContextService
      .getLogger()
      .error(
        'Agent status runtime field is missing, unable to get agent status for agent ' + agent.id
      );
  } else {
    agent.status = hit.fields.status[0];
  }

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
