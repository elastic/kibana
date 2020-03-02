/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract, SavedObject, KibanaRequest } from 'kibana/server';
import { ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE } from '../../constants';
import { CallESAsCurrentUser, EnrollmentAPIKeySOAttributes, EnrollmentAPIKey } from '../../types';
import { createAPIKey, authenticate } from './security';

export * from './enrollment_api_key';

export async function generateOutputApiKey(
  soClient: SavedObjectsClientContract,
  outputId: string,
  agentId: string
): Promise<string> {
  const name = `${agentId}:${outputId}`;
  const key = await createAPIKey(soClient, name, {
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

export async function generateAccessApiKey(
  soClient: SavedObjectsClientContract,
  agentId: string,
  configId: string
) {
  const key = await createAPIKey(soClient, agentId, {
    'fleet-agent': {},
  });

  if (!key) {
    throw new Error('Unable to create an access api key');
  }

  return { id: key.id, key: Buffer.from(`${key.id}:${key.api_key}`).toString('base64') };
}

/**
 * Verify if an an access api key is valid
 */
export async function verifyAccessApiKey({
  headers,
  callCluster,
}: {
  headers: KibanaRequest['headers'];
  callCluster: CallESAsCurrentUser;
}): Promise<{ valid: boolean; accessApiKeyId?: string; reason?: string }> {
  try {
    const { apiKeyId } = _parseApiKey(headers);

    await authenticate(callCluster);

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

export async function verifyEnrollmentAPIKey({
  soClient,
  headers,
  callCluster,
}: {
  soClient: SavedObjectsClientContract;
  headers: KibanaRequest['headers'];
  callCluster: CallESAsCurrentUser;
}) {
  try {
    const { apiKeyId } = _parseApiKey(headers);

    await authenticate(callCluster);

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

function _parseApiKey(headers: KibanaRequest['headers']) {
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
