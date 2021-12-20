/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from 'src/core/server';
import type { ISavedObjectsRepository } from 'kibana/server';

import { generateEnrollmentAPIKey, deleteEnrollmentApiKeyForAgentPolicyId } from './api_keys';
import { unenrollForAgentPolicyId } from './agents';
import { agentPolicyService } from './agent_policy';

export async function agentPolicyUpdateEventHandler(
  soClient: ISavedObjectsRepository,
  esClient: ElasticsearchClient,
  action: string,
  agentPolicyId: string
) {
  if (action === 'created') {
    await generateEnrollmentAPIKey(soClient, esClient, {
      name: 'Default',
      agentPolicyId,
    });
    await agentPolicyService.createFleetServerPolicy(soClient, agentPolicyId);
  }

  if (action === 'updated') {
    await agentPolicyService.createFleetServerPolicy(soClient, agentPolicyId);
  }

  if (action === 'deleted') {
    await unenrollForAgentPolicyId(soClient, esClient, agentPolicyId);
    await deleteEnrollmentApiKeyForAgentPolicyId(esClient, agentPolicyId);
  }
}
