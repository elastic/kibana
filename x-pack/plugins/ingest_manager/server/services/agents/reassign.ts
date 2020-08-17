/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import Boom from 'boom';
import { AGENT_SAVED_OBJECT_TYPE } from '../../constants';
import { AgentSOAttributes } from '../../types';
import { agentPolicyService } from '../agent_policy';

export async function reassignAgent(
  soClient: SavedObjectsClientContract,
  agentId: string,
  newAgentPolicyId: string
) {
  const agentPolicy = await agentPolicyService.get(soClient, newAgentPolicyId);
  if (!agentPolicy) {
    throw Boom.notFound(`Agent policy not found: ${newAgentPolicyId}`);
  }

  await soClient.update<AgentSOAttributes>(AGENT_SAVED_OBJECT_TYPE, agentId, {
    policy_id: newAgentPolicyId,
    policy_revision: null,
  });
}
