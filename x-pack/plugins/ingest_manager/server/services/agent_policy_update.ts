/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest, SavedObjectsClientContract } from 'src/core/server';
import { generateEnrollmentAPIKey, deleteEnrollmentApiKeyForAgentPolicyId } from './api_keys';
import { unenrollForAgentPolicyId } from './agents';
import { outputService } from './output';
import { agentPolicyService } from './agent_policy';
import { appContextService } from './app_context';

const fakeRequest = ({
  headers: {},
  getBasePath: () => '',
  path: '/',
  route: { settings: {} },
  url: {
    href: '/',
  },
  raw: {
    req: {
      url: '/',
    },
  },
} as unknown) as KibanaRequest;

export async function agentPolicyUpdateEventHandler(
  soClient: SavedObjectsClientContract,
  action: string,
  agentPolicyId: string
) {
  const adminUser = await outputService.getAdminUser(soClient);
  const outputId = await outputService.getDefaultOutputId(soClient);

  // If no admin user and no default output fleet is not enabled just skip this hook
  if (!adminUser || !outputId) {
    return;
  }

  // `soClient` from ingest `appContextService` is used to create policy change actions
  // to ensure encrypted SOs are handled correctly
  const internalSoClient = appContextService.getInternalUserSOClient(fakeRequest);

  if (action === 'created') {
    await generateEnrollmentAPIKey(soClient, {
      agentPolicyId,
    });
    await agentPolicyService.createFleetPolicyChangeAction(internalSoClient, agentPolicyId);
  }

  if (action === 'updated') {
    await agentPolicyService.createFleetPolicyChangeAction(internalSoClient, agentPolicyId);
  }

  if (action === 'deleted') {
    await unenrollForAgentPolicyId(soClient, agentPolicyId);
    await deleteEnrollmentApiKeyForAgentPolicyId(soClient, agentPolicyId);
  }
}
