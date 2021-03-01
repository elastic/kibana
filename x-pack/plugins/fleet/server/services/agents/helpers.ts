/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESSearchHit } from '../../../../../typings/elasticsearch';
import { Agent, AgentSOAttributes, FleetServerAgent } from '../../types';

export function searchHitToAgent(hit: ESSearchHit<FleetServerAgent>): Agent {
  return {
    id: hit._id,
    ...hit._source,
    policy_revision: hit._source.policy_revision_idx,
    current_error_events: [],
    access_api_key: undefined,
    status: undefined,
    packages: hit._source.packages ?? [],
  };
}

export function agentSOAttributesToFleetServerAgentDoc(
  data: Partial<AgentSOAttributes>
): Partial<Omit<FleetServerAgent, 'id'>> {
  const { policy_revision: policyRevison, ...rest } = data;

  const doc: Partial<Omit<FleetServerAgent, 'id'>> = { ...rest };

  if (policyRevison !== undefined) {
    doc.policy_revision_idx = policyRevison;
  }

  return doc;
}
