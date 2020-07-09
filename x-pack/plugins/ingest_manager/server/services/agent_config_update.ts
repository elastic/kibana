/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import { generateEnrollmentAPIKey, deleteEnrollmentApiKeyForConfigId } from './api_keys';
import { unenrollForConfigId } from './agents';
import { outputService } from './output';

export async function agentConfigUpdateEventHandler(
  soClient: SavedObjectsClientContract,
  action: string,
  configId: string
) {
  const adminUser = await outputService.getAdminUser(soClient);
  // If no admin user fleet is not enabled just skip this hook
  if (!adminUser) {
    return;
  }

  if (action === 'created') {
    await generateEnrollmentAPIKey(soClient, {
      configId,
    });
  }

  if (action === 'deleted') {
    await unenrollForConfigId(soClient, configId);
    await deleteEnrollmentApiKeyForConfigId(soClient, configId);
  }
}
