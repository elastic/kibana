/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { SavedObjectsClientContract, SavedObject } from 'src/core/server';
import { EnrollmentAPIKey, EnrollmentAPIKeySOAttributes } from '../../types';
import { ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE } from '../../constants';
import { createAPIKey, invalidateAPIKey } from './security';
import { agentConfigService } from '../agent_config';

export async function listEnrollmentApiKeys(
  soClient: SavedObjectsClientContract,
  options: {
    page?: number;
    perPage?: number;
    kuery?: string;
    showInactive?: boolean;
  }
): Promise<{ items: EnrollmentAPIKey[]; total: any; page: any; perPage: any }> {
  const { page = 1, perPage = 20, kuery } = options;

  const { saved_objects, total } = await soClient.find<EnrollmentAPIKeySOAttributes>({
    type: ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE,
    page,
    perPage,
    filter:
      kuery && kuery !== ''
        ? kuery.replace(/enrollment_api_keys\./g, 'enrollment_api_keys.attributes.')
        : undefined,
  });

  const items = saved_objects.map(savedObjectToEnrollmentApiKey);

  return {
    items,
    total,
    page,
    perPage,
  };
}

export async function getEnrollmentAPIKey(soClient: SavedObjectsClientContract, id: string) {
  return savedObjectToEnrollmentApiKey(
    await soClient.get<EnrollmentAPIKeySOAttributes>(ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE, id)
  );
}

export async function deleteEnrollmentApiKey(soClient: SavedObjectsClientContract, id: string) {
  const enrollmentApiKey = await getEnrollmentAPIKey(soClient, id);

  await invalidateAPIKey(soClient, enrollmentApiKey.api_key_id);

  await soClient.delete(ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE, id);
}

export async function deleteEnrollmentApiKeyForConfigId(
  soClient: SavedObjectsClientContract,
  configId: string
) {
  let hasMore = true;
  let page = 1;
  while (hasMore) {
    const { items } = await listEnrollmentApiKeys(soClient, {
      page: page++,
      perPage: 100,
      kuery: `enrollment_api_keys.config_id:${configId}`,
    });

    if (items.length === 0) {
      hasMore = false;
    }

    for (const apiKey of items) {
      await deleteEnrollmentApiKey(soClient, apiKey.id);
    }
  }
}

export async function generateEnrollmentAPIKey(
  soClient: SavedObjectsClientContract,
  data: {
    name?: string;
    expiration?: string;
    configId?: string;
  }
) {
  const id = uuid.v4();
  const { name: providedKeyName } = data;
  const configId = data.configId ?? (await agentConfigService.getDefaultAgentConfigId(soClient));

  const name = providedKeyName ? `${providedKeyName} (${id})` : id;

  const key = await createAPIKey(soClient, name, {
    // Useless role to avoid to have the privilege of the user that created the key
    'fleet-apikey-enroll': {
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
    throw new Error('Unable to create an enrollment api key');
  }

  const apiKey = Buffer.from(`${key.id}:${key.api_key}`).toString('base64');

  return savedObjectToEnrollmentApiKey(
    await soClient.create<EnrollmentAPIKeySOAttributes>(ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE, {
      active: true,
      api_key_id: key.id,
      api_key: apiKey,
      name,
      config_id: configId,
    })
  );
}

function savedObjectToEnrollmentApiKey({
  error,
  attributes,
  id,
}: SavedObject<EnrollmentAPIKeySOAttributes>): EnrollmentAPIKey {
  if (error) {
    throw new Error(error.message);
  }

  return {
    id,
    ...attributes,
  };
}
