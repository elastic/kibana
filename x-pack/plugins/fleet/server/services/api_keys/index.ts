/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract, KibanaRequest } from 'src/core/server';
import { createAPIKey } from './security';

export { invalidateAPIKeys } from './security';
export * from './enrollment_api_key';

export async function generateOutputApiKey(
  soClient: SavedObjectsClientContract,
  outputId: string,
  agentId: string
): Promise<{ key: string; id: string }> {
  const name = `${agentId}:${outputId}`;
  const key = await createAPIKey(soClient, name, {
    'fleet-output': {
      cluster: ['monitor'],
      index: [
        {
          names: ['logs-*', 'metrics-*', 'traces-*', '.logs-endpoint.diagnostic.collection-*'],
          privileges: ['auto_configure', 'create_doc', 'indices:admin/auto_create'],
        },
      ],
    },
  });

  if (!key) {
    throw new Error('Unable to create an output api key');
  }

  return { key: `${key.id}:${key.api_key}`, id: key.id };
}

export async function generateAccessApiKey(soClient: SavedObjectsClientContract, agentId: string) {
  const key = await createAPIKey(soClient, agentId, {
    // Useless role to avoid to have the privilege of the user that created the key
    'fleet-apikey-access': {
      cluster: [],
      applications: [
        {
          application: '.fleet',
          privileges: ['no-privileges'],
          resources: ['*'],
        },
      ],
    },
  });

  if (!key) {
    throw new Error('Unable to create an access api key');
  }

  return { id: key.id, key: Buffer.from(`${key.id}:${key.api_key}`).toString('base64') };
}

export function parseApiKeyFromHeaders(headers: KibanaRequest['headers']) {
  const authorizationHeader = headers.authorization;

  if (!authorizationHeader) {
    throw new Error('Authorization header must be set');
  }

  if (Array.isArray(authorizationHeader)) {
    throw new Error('Authorization header must be `string` not `string[]`');
  }

  if (!authorizationHeader.startsWith('ApiKey ')) {
    throw new Error('Authorization header is malformed');
  }

  const apiKey = authorizationHeader.split(' ')[1];

  return parseApiKey(apiKey);
}

export function parseApiKey(apiKey: string) {
  const apiKeyId = Buffer.from(apiKey, 'base64').toString('utf8').split(':')[0];

  return {
    apiKey,
    apiKeyId,
  };
}
