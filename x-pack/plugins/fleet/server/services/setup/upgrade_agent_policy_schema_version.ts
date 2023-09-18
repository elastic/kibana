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
} from '../../constants';
import { agentPolicyService } from '../agent_policy';
import { appContextService } from '../app_context';

const DEFAULT_BATCH_SIZE = 2;
function getOutdatedAgentPoliciesBatch(soClient: SavedObjectsClientContract, batchSize: number) {
  return agentPolicyService.list(soClient, {
    perPage: batchSize,
    kuery: `NOT ${AGENT_POLICY_SAVED_OBJECT_TYPE}.schema_version:${FLEET_AGENT_POLICIES_SCHEMA_VERSION}`,
    fields: ['id'], // we only need the ID of the agent policy
  });
}

// used to migrate ingest-agent-policies SOs to .fleet-policies
// fetch SOs from ingest-agent-policies with outdated schema_version
// deploy outdated policies to .fleet-policies index
// bump oudated SOs schema_version
export async function upgradeAgentPolicySchemaVersion(soClient: SavedObjectsClientContract) {
  const config = appContextService.getConfig();
  const logger = appContextService.getLogger();

  const batchSize = config?.setup?.agentPolicySchemaUpgradeBatchSize ?? DEFAULT_BATCH_SIZE;
  let outdatedAgentPolicies = await getOutdatedAgentPoliciesBatch(soClient, batchSize);
  logger.debug(`Found ${outdatedAgentPolicies.total} outdated agent policies`);
  while (outdatedAgentPolicies.total > 0) {
    const start = Date.now();
    const outdatedAgentPolicyIds = outdatedAgentPolicies.items.map(
      (outdatedAgentPolicy) => outdatedAgentPolicy.id
    );
    await agentPolicyService.deployPolicies(soClient, outdatedAgentPolicyIds);
    outdatedAgentPolicies = await getOutdatedAgentPoliciesBatch(soClient, batchSize);
    logger.debug(
      `Upgraded ${outdatedAgentPolicyIds.length} agent policies in ${Date.now() - start}ms, ${
        outdatedAgentPolicies.total
      } remaining`
    );
  }
}
