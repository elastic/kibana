/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import { generateEnrollmentAPIKey, deleteEnrollmentApiKeyForAgentPolicyId } from './api_keys';
import { unenrollForAgentPolicyId } from './agents';
import { outputService } from './output';

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

  if (action === 'deleted') {
    await unenrollForAgentPolicyId(soClient, agentPolicyId);
    await deleteEnrollmentApiKeyForAgentPolicyId(soClient, agentPolicyId);
  }
}
