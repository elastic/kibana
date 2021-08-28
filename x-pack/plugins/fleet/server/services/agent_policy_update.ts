/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from '../../../../../src/core/server/elasticsearch/client/types';
import type { KibanaRequest } from '../../../../../src/core/server/http/router/request';
import type { SavedObjectsClientContract } from '../../../../../src/core/server/saved_objects/types';

import { unenrollForAgentPolicyId } from './agents/update';
import { agentPolicyService } from './agent_policy';
import {
  deleteEnrollmentApiKeyForAgentPolicyId,
  generateEnrollmentAPIKey,
} from './api_keys/enrollment_api_key';
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
  esClient: ElasticsearchClient,
  action: string,
  agentPolicyId: string
) {
  // `soClient` from ingest `appContextService` is used to create policy change actions
  // to ensure encrypted SOs are handled correctly
  const internalSoClient = appContextService.getInternalUserSOClient(fakeRequest);

  if (action === 'created') {
    await generateEnrollmentAPIKey(soClient, esClient, {
      name: 'Default',
      agentPolicyId,
    });
    await agentPolicyService.createFleetPolicyChangeAction(internalSoClient, agentPolicyId);
  }

  if (action === 'updated') {
    await agentPolicyService.createFleetPolicyChangeAction(internalSoClient, agentPolicyId);
  }

  if (action === 'deleted') {
    await unenrollForAgentPolicyId(soClient, esClient, agentPolicyId);
    await deleteEnrollmentApiKeyForAgentPolicyId(esClient, agentPolicyId);
  }
}
