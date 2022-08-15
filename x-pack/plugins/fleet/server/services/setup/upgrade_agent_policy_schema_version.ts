/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';

import {
  AGENT_POLICY_SAVED_OBJECT_TYPE,
  FLEET_AGENT_POLICIES_SCHEMA_VERSION,
  SO_SEARCH_LIMIT,
} from '../../constants';
import { agentPolicyService } from '../agent_policy';

function getOutdatedAgentPoliciesBatch(soClient: SavedObjectsClientContract) {
  return agentPolicyService.list(soClient, {
    perPage: SO_SEARCH_LIMIT,
    kuery: `NOT ${AGENT_POLICY_SAVED_OBJECT_TYPE}.schema_version:${FLEET_AGENT_POLICIES_SCHEMA_VERSION}`,
  });
}

// used to migrate ingest-agent-policies SOs to .fleet-policies
// fetch SOs from ingest-agent-policies with outdated schema_version
// deploy outdated policies to .fleet-policies index
// bump oudated SOs schema_version
export async function upgradeAgentPolicySchemaVersion(soClient: SavedObjectsClientContract) {
  let outdatedAgentPolicies = await getOutdatedAgentPoliciesBatch(soClient);

  while (outdatedAgentPolicies.total > 0) {
    const outdatedAgentPolicyIds = outdatedAgentPolicies.items.map(
      (outdatedAgentPolicy) => outdatedAgentPolicy.id
    );
    await agentPolicyService.deployPolicies(soClient, outdatedAgentPolicyIds);
    outdatedAgentPolicies = await getOutdatedAgentPoliciesBatch(soClient);
  }
}
