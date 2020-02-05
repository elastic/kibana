/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest, FakeRequest } from 'kibana/server';
import { appContextService } from './app_context';
import { outputService } from './output';

export async function generateOutputApiKey(outputId: string, agentId: string): Promise<string> {
  const name = `${agentId}:${outputId}`;
  const key = await _createAPIKey(name, {
    'fleet-output': {
      cluster: ['monitor'],
      index: [
        {
          names: ['logs-*', 'metrics-*'],
          privileges: ['write'],
        },
      ],
    },
  });

  if (!key) {
    throw new Error('Unable to create an output api key');
  }

  return `${key.id}:${key.api_key}`;
}

async function _createAPIKey(name: string, roleDescriptors: any) {
  const adminUser = await outputService.getAdminUser();
  const request: FakeRequest = {
    headers: {
      authorization: `Basic ${Buffer.from(`${adminUser.username}:${adminUser.password}`).toString(
        'base64'
      )}`,
    },
  };
  const security = appContextService.getSecurity();
  if (!security) {
    throw new Error('Missing security plugin');
  }

  return security.authc.createAPIKey(request as KibanaRequest, {
    name,
    role_descriptors: roleDescriptors,
  });
}

/**
 * Verify if an an access api key is valid
 */
export async function verifyAccessApiKey(
  headers: any
): Promise<{ valid: boolean; accessApiKeyId?: string; reason?: string }> {
  try {
    const { apiKeyId } = _parseApiKey(headers);

    await _authenticate(headers);

    return {
      valid: true,
      accessApiKeyId: apiKeyId,
    };
  } catch (error) {
    return {
      valid: false,
      reason: error.message || 'ApiKey is not valid',
    };
  }
}

function _parseApiKey(headers: any) {
  const authorizationHeader = headers.authorization;

  if (!authorizationHeader) {
    throw new Error('Authorization header must be set');
  }

  if (!authorizationHeader.startsWith('ApiKey ')) {
    throw new Error('Authorization header is malformed');
  }

  const apiKey = authorizationHeader.split(' ')[1];
  if (!apiKey) {
    throw new Error('Authorization header is malformed');
  }
  const apiKeyId = Buffer.from(apiKey, 'base64')
    .toString('utf8')
    .split(':')[0];

  return {
    apiKey,
    apiKeyId,
  };
}

async function _authenticate(headers: any) {
  const security = appContextService.getSecurity();
  if (!security) {
    throw new Error('Missing security plugin');
  }
  const res = await security.authc.isAuthenticated({ headers } as KibanaRequest);

  if (!res) {
    throw new Error('ApiKey is not valid: impossible to authicate user');
  }
}
