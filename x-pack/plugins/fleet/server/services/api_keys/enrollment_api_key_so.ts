/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import Boom from '@hapi/boom';
import { SavedObjectsClientContract, SavedObject } from 'src/core/server';
import { EnrollmentAPIKey, EnrollmentAPIKeySOAttributes } from '../../types';
import { ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE } from '../../constants';
import { createAPIKey, invalidateAPIKeys } from './security';
import { agentPolicyService } from '../agent_policy';
import { appContextService } from '../app_context';
import { normalizeKuery, escapeSearchQueryPhrase } from '../saved_object';

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

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { saved_objects, total } = await soClient.find<EnrollmentAPIKeySOAttributes>({
    type: ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE,
    page,
    perPage,
    sortField: 'created_at',
    sortOrder: 'desc',
    filter:
      kuery && kuery !== ''
        ? normalizeKuery(ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE, kuery)
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
  const so = await appContextService
    .getEncryptedSavedObjects()
    .getDecryptedAsInternalUser<EnrollmentAPIKeySOAttributes>(
      ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE,
      id
    );
  return savedObjectToEnrollmentApiKey(so);
}

/**
 * Invalidate an api key and mark it as inactive
 * @param soClient
 * @param id
 */
export async function deleteEnrollmentApiKey(soClient: SavedObjectsClientContract, id: string) {
  const enrollmentApiKey = await getEnrollmentAPIKey(soClient, id);

  await invalidateAPIKeys(soClient, [enrollmentApiKey.api_key_id]);

  await soClient.update(ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE, id, {
    active: false,
  });
}

export async function deleteEnrollmentApiKeyForAgentPolicyId(
  soClient: SavedObjectsClientContract,
  agentPolicyId: string
) {
  let hasMore = true;
  let page = 1;
  while (hasMore) {
    const { items } = await listEnrollmentApiKeys(soClient, {
      page: page++,
      perPage: 100,
      kuery: `${ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE}.policy_id:${agentPolicyId}`,
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
    agentPolicyId?: string;
  }
) {
  const id = uuid.v4();
  const { name: providedKeyName } = data;
  if (data.agentPolicyId) {
    await validateAgentPolicyId(soClient, data.agentPolicyId);
  }
  const agentPolicyId =
    data.agentPolicyId ?? (await agentPolicyService.getDefaultAgentPolicyId(soClient));
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

  const so = await soClient.create<EnrollmentAPIKeySOAttributes>(
    ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE,
    {
      active: true,
      api_key_id: key.id,
      api_key: apiKey,
      name,
      policy_id: agentPolicyId,
      created_at: new Date().toISOString(),
    }
  );

  return getEnrollmentAPIKey(soClient, so.id);
}

async function validateAgentPolicyId(soClient: SavedObjectsClientContract, agentPolicyId: string) {
  try {
    await agentPolicyService.get(soClient, agentPolicyId);
  } catch (e) {
    if (e.isBoom && e.output.statusCode === 404) {
      throw Boom.badRequest(`Agent policy ${agentPolicyId} does not exist`);
    }
    throw e;
  }
}

export async function getEnrollmentAPIKeyById(
  soClient: SavedObjectsClientContract,
  apiKeyId: string
) {
  const [enrollmentAPIKey] = (
    await soClient.find<EnrollmentAPIKeySOAttributes>({
      type: ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE,
      searchFields: ['api_key_id'],
      search: escapeSearchQueryPhrase(apiKeyId),
    })
  ).saved_objects.map(savedObjectToEnrollmentApiKey);

  if (enrollmentAPIKey?.api_key_id !== apiKeyId) {
    throw new Error('find enrollmentKeyById returned an incorrect key');
  }

  return enrollmentAPIKey;
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
