/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import semver from 'semver';
import { AgentPolicyInfo } from '../../../../common/types';
import { SyntheticsServerSetup } from '../../../types';
import { AgentsMeta } from '../../../synthetics_service/get_private_locations';
import type { SyntheticsPrivateLocations } from '../../../../common/runtime_types';
import type {
  SyntheticsPrivateLocationsAttributes,
  PrivateLocationAttributes,
} from '../../../runtime_types/private_locations';
import { PrivateLocation } from '../../../../common/runtime_types';

export const toClientContract = (
  locations: SyntheticsPrivateLocationsAttributes,
  agentPolicies: AgentPolicyInfo[] = [],
  agentsMeta: AgentsMeta = []
): SyntheticsPrivateLocations => {
  return locations.map((location) => ({
    label: location.label,
    id: location.id,
    agentPolicyId: location.agentPolicyId,
    concurrentMonitors: location.concurrentMonitors,
    isServiceManaged: false,
    isInvalid: !Boolean(agentPolicies?.find((policy) => policy.id === location.agentPolicyId)),
    tags: location.tags,
    geo: location.geo,
    isComplete: agentsMeta.find((agent) => agent.id === location.agentPolicyId)?.agentType,
  }));
};

export const toSavedObjectContract = (location: PrivateLocation): PrivateLocationAttributes => {
  return {
    label: location.label,
    id: location.id,
    agentPolicyId: location.agentPolicyId,
    concurrentMonitors: location.concurrentMonitors,
    tags: location.tags,
    isServiceManaged: false,
    geo: location.geo,
  };
};

export const resolveAgentPolicyComplete = async (
  policyIds: string[],
  server: SyntheticsServerSetup
): Promise<AgentsMeta> => {
  const targetVersion = '8.10.0';

  const { agents } = await server.fleet?.agentService.asInternalUser.listAgents({
    kuery: policyIds.map((id) => `fleet-agents.policy_id : ${id}`).join(' or '),
    showInactive: false,
    perPage: 10000,
  });
  return policyIds.map((id) => {
    const policyAgents = agents.filter(
      (agent) =>
        agent.policy_id === id &&
        agent.agent?.version &&
        semver.compare(agent.agent?.version, targetVersion) >= 0
    );
    if (policyAgents.length === 0) {
      return {
        id,
        agentType: 'unknown',
      };
    }
    const completeAgents = agents.some((agent) => agent.local_metadata?.elastic?.agent?.complete);

    return {
      id,
      isComplete: completeAgents ? 'complete' : 'lightweight',
    };
  });
};
