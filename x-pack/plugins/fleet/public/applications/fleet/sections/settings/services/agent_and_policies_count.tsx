/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sendGetAgentPolicies, sendGetAgents } from '../../../hooks';
import type { Output } from '../../../types';
import { AGENT_POLICY_SAVED_OBJECT_TYPE, SO_SEARCH_LIMIT } from '../../../constants';

export async function getAgentAndPolicyCountForOutput(output: Output) {
  let kuery = `${AGENT_POLICY_SAVED_OBJECT_TYPE}.data_output_id:"${output.id}" or ${AGENT_POLICY_SAVED_OBJECT_TYPE}.monitoring_output_id:"${output.id}"`;
  if (output.is_default) {
    kuery += ` or (not ${AGENT_POLICY_SAVED_OBJECT_TYPE}.data_output_id:*)`;
  }
  const agentPolicies = await sendGetAgentPolicies({
    kuery,
    page: 1,
    perPage: SO_SEARCH_LIMIT,
  });

  if (agentPolicies.error) {
    throw agentPolicies.error;
  }
  const agentPolicyCount = agentPolicies.data?.items?.length ?? 0;

  let agentCount = 0;
  if (agentPolicyCount > 0) {
    const agents = await sendGetAgents({
      page: 1,
      perPage: 0, // We only need the count here
      showInactive: false,
      kuery: agentPolicies.data?.items.map((policy) => `policy_id:"${policy.id}"`).join(' or '),
    });

    if (agents.error) {
      throw agents.error;
    }

    agentCount = agents.data?.total ?? 0;
  }

  return { agentPolicyCount, agentCount };
}

export async function getAgentAndPolicyCount() {
  const agentPolicies = await sendGetAgentPolicies({
    perPage: 0,
  });

  if (agentPolicies.error) {
    throw agentPolicies.error;
  }
  const agentPolicyCount = agentPolicies.data?.total ?? 0;

  const agents = await sendGetAgents({
    page: 1,
    perPage: 0, // We only need the count here
    showInactive: false,
  });

  if (agents.error) {
    throw agents.error;
  }

  const agentCount = agents.data?.total ?? 0;

  return { agentPolicyCount, agentCount };
}
