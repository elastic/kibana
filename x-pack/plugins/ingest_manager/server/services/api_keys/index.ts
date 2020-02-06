/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest, FakeRequest, SavedObjectsClientContract, SavedObject } from 'kibana/server';
import { appContextService } from '../app_context';
import { outputService } from '../output';
import { ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE } from '../../constants';
import { EnrollmentAPIKeySOAttributes, EnrollmentAPIKey } from '../../types';

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

export async function generateAccessApiKey(agentId: string, policyId: string) {
  const key = await _createAPIKey(agentId, {
    'fleet-agent': {},
  });

  if (!key) {
    throw new Error('Unable to create an access api key');
  }

  return { id: key.id, key: Buffer.from(`${key.id}:${key.api_key}`).toString('base64') };
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

export async function verifyEnrollmentAPIKey(soClient: SavedObjectsClientContract, headers: any) {
  try {
    const { apiKeyId } = _parseApiKey(headers);

    await _authenticate(headers);

    const [enrollmentAPIKey] = (
      await soClient.find<EnrollmentAPIKeySOAttributes>({
        type: ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE,
        searchFields: ['api_key_id'],
        search: apiKeyId,
      })
    ).saved_objects.map(_savedObjectToEnrollmentApiKey);

    if (!enrollmentAPIKey || !enrollmentAPIKey.active) {
      throw new Error('Enrollement api key does not exists or is not active');
    }

    return {
      valid: true,
      enrollmentAPIKey,
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
  const clusterClient = appContextService.getClusterClient();
  if (!clusterClient) {
    throw new Error('Missing clusterClient');
  }
  try {
    await clusterClient
      .asScoped({ headers } as KibanaRequest)
      .callAsCurrentUser('transport.request', {
        path: '/_security/_authenticate',
        method: 'GET',
      });
  } catch (e) {
    throw new Error('ApiKey is not valid: impossible to authicate user');
  }
}

function _savedObjectToEnrollmentApiKey({
  error,
  attributes,
  id,
}: SavedObject<any>): EnrollmentAPIKey {
  if (error) {
    throw new Error(error.message);
  }

  return {
    id,
    ...attributes,
  };
}
