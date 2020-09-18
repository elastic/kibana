/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { KibanaRequest, SavedObjectsClientContract } from 'src/core/server';
import { Agent } from '../../types';
import * as APIKeyService from '../api_keys';
import { getAgentByAccessAPIKeyId } from './crud';

export async function authenticateAgentWithAccessToken(
  soClient: SavedObjectsClientContract,
  request: KibanaRequest
): Promise<Agent> {
  if (!request.auth.isAuthenticated) {
    throw Boom.unauthorized('Request not authenticated');
  }
  let res: { apiKey: string; apiKeyId: string };
  try {
    res = APIKeyService.parseApiKeyFromHeaders(request.headers);
  } catch (err) {
    throw Boom.unauthorized(err.message);
  }

  const agent = await getAgentByAccessAPIKeyId(soClient, res.apiKeyId);

  return agent;
}
