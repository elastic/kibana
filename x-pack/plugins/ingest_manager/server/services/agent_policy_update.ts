/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import { generateEnrollmentAPIKey, deleteEnrollmentApiKeyForAgentPolicyId } from './api_keys';
import { unenrollForAgentPolicyId, createAgentAction } from './agents';
import { outputService } from './output';
import { agentPolicyService } from './agent_policy';

export async function agentPolicyUpdateEventHandler(
  soClient: SavedObjectsClientContract,
  action: string,
  agentPolicyId: string
) {
  const adminUser = await outputService.getAdminUser(soClient);
  // If no admin user fleet is not enabled just skip this hook
  if (!adminUser) {
    return;
  }

  if (action === 'created') {
    await generateEnrollmentAPIKey(soClient, {
      agentPolicyId,
    });
  }

  if (action === 'updated') {
    const policy = await agentPolicyService.getFullAgentPolicy(soClient, agentPolicyId);
    if (!policy) {
      return;
    }
    const packages = policy.inputs.reduce<string[]>((acc, input) => {
      const packageName = input.meta?.package?.name;
      if (packageName && acc.indexOf(packageName) < 0) {
        return [packageName, ...acc];
      }
      return acc;
    }, []);

    await createAgentAction(soClient, {
      type: 'CONFIG_CHANGE',
      data: { config: policy } as any,
      ack_data: { packages },
      created_at: new Date().toISOString(),
      sent_at: undefined,
      policy_id: policy.id,
      policy_revision: policy.revision,
    });
  }

  if (action === 'deleted') {
    await unenrollForAgentPolicyId(soClient, agentPolicyId);
    await deleteEnrollmentApiKeyForAgentPolicyId(soClient, agentPolicyId);
  }
}
