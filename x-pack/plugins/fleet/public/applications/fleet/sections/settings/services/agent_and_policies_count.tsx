/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sendGetAgentPolicies, sendGetPackagePolicies, sendGetAgents } from '../../../hooks';
import type { Output } from '../../../types';
import {
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE,
  SO_SEARCH_LIMIT,
} from '../../../constants';

export async function getAgentAndPolicyCountForOutput(output: Output) {
  let agentPolicyKuery = `${LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE}.data_output_id:"${output.id}" or ${LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE}.monitoring_output_id:"${output.id}"`;
  const packagePolicyKuery = `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.output_id:"${output.id}"`;

  if (output.is_default) {
    agentPolicyKuery += ` or (not ${LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE}.data_output_id:*)`;
  }

  const agentPolicies = await sendGetAgentPolicies({
    kuery: agentPolicyKuery,
    page: 1,
    perPage: SO_SEARCH_LIMIT,
    noAgentCount: true,
  });

  if (agentPolicies.error) {
    throw agentPolicies.error;
  }

  const packagePolicies = await sendGetPackagePolicies({
    kuery: packagePolicyKuery,
    page: 1,
    perPage: SO_SEARCH_LIMIT,
  });

  if (packagePolicies.error) {
    throw agentPolicies.error;
  }

  const agentPolicyIds = (agentPolicies.data?.items || []).map((policy) => policy.id);
  const agentPolicyIdsFromPackagePolicies = (packagePolicies.data?.items || []).reduce(
    (acc: string[], packagePolicy) => {
      return [...acc, ...(packagePolicy.policy_ids || [])];
    },
    []
  );
  const uniqueAgentPolicyIds = new Set([...agentPolicyIds, ...agentPolicyIdsFromPackagePolicies]);
  const agentPolicyCount = uniqueAgentPolicyIds.size;

  let agentCount = 0;
  if (agentPolicyCount > 0) {
    const agents = await sendGetAgents({
      page: 1,
      perPage: 0, // We only need the count here
      showInactive: false,
      kuery: [...uniqueAgentPolicyIds].map((id) => `policy_id:"${id}"`).join(' or '),
    });

    if (agents.error) {
      throw agents.error;
    }

    agentCount = agents.data?.total ?? 0;
  }

  return { agentPolicyCount, agentCount };
}
