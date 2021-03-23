/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KibanaRequest } from 'src/core/server';
import type { ElasticsearchClient } from 'src/core/server';

import type { Agent } from '../../types';
import * as APIKeyService from '../api_keys';

import { getAgentByAccessAPIKeyId } from './crud';

export async function authenticateAgentWithAccessToken(
  esClient: ElasticsearchClient,
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

  const agent = await getAgentByAccessAPIKeyId(esClient, res.apiKeyId);

  return agent;
}
