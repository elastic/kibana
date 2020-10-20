/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import { SO_SEARCH_LIMIT } from '../../constants';
import { agentPolicyService } from '../agent_policy';
import { outputService } from '../output';
import { getLatestConfigChangeAction } from './actions';

export async function isAgentsSetup(soClient: SavedObjectsClientContract): Promise<boolean> {
  const adminUser = await outputService.getAdminUser(soClient, false);
  const outputId = await outputService.getDefaultOutputId(soClient);
  // If admin user (fleet_enroll) and output id exist Agents are correctly setup
  return adminUser && outputId ? true : false;
}

/**
 * During the migration from 7.9 to 7.10 we introduce a new agent action POLICY_CHANGE per policy
 * this function ensure that action exist for each policy
 *
 * @param soClient
 */
export async function ensureAgentActionPolicyChangeExists(soClient: SavedObjectsClientContract) {
  // If Agents are not setup skip
  if (!(await isAgentsSetup(soClient))) {
    return;
  }

  const { items: agentPolicies } = await agentPolicyService.list(soClient, {
    perPage: SO_SEARCH_LIMIT,
  });

  await Promise.all(
    agentPolicies.map(async (agentPolicy) => {
      const policyChangeActionExist = !!(await getLatestConfigChangeAction(
        soClient,
        agentPolicy.id
      ));

      if (!policyChangeActionExist) {
        return agentPolicyService.createFleetPolicyChangeAction(soClient, agentPolicy.id);
      }
    })
  );
}
