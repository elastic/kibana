/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import { generateEnrollmentAPIKey, deleteEnrollmentApiKeyForPolicyId } from './api_keys';
import { updateAgentsForPolicyId, unenrollForPolicyId } from './agents';

export async function agentConfigUpdateEventHandler(
  soClient: SavedObjectsClientContract,
  action: string,
  policyId: string
) {
  if (action === 'created') {
    await generateEnrollmentAPIKey(soClient, {
      policyId,
    });
  }

  if (action === 'updated') {
    await updateAgentsForPolicyId(soClient, policyId);
  }

  if (action === 'deleted') {
    await unenrollForPolicyId(soClient, policyId);
    await deleteEnrollmentApiKeyForPolicyId(soClient, policyId);
  }
}
