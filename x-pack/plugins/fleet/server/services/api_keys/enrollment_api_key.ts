/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import Boom from '@hapi/boom';
import { GetResponse } from 'elasticsearch';
import { ResponseError } from '@elastic/elasticsearch/lib/errors';
import type { SavedObjectsClientContract, ElasticsearchClient } from 'src/core/server';

import { ESSearchResponse as SearchResponse } from '../../../../../typings/elasticsearch';
import type { EnrollmentAPIKey, FleetServerEnrollmentAPIKey } from '../../types';
import { ENROLLMENT_API_KEYS_INDEX } from '../../constants';
import { agentPolicyService } from '../agent_policy';
import { escapeSearchQueryPhrase } from '../saved_object';

import { createAPIKey, invalidateAPIKeys } from './security';

export async function listEnrollmentApiKeys(
  esClient: ElasticsearchClient,
  options: {
    page?: number;
    perPage?: number;
    kuery?: string;
    showInactive?: boolean;
  }
): Promise<{ items: EnrollmentAPIKey[]; total: any; page: any; perPage: any }> {
  const { page = 1, perPage = 20, kuery } = options;

  const res = await esClient.search<SearchResponse<FleetServerEnrollmentAPIKey, {}>>({
    index: ENROLLMENT_API_KEYS_INDEX,
    from: (page - 1) * perPage,
    size: perPage,
    sort: 'created_at:desc',
    track_total_hits: true,
    q: kuery,
  });

  const items = res.body.hits.hits.map(esDocToEnrollmentApiKey);

  return {
    items,
    total: res.body.hits.total.value,
    page,
    perPage,
  };
}

export async function getEnrollmentAPIKey(
  esClient: ElasticsearchClient,
  id: string
): Promise<EnrollmentAPIKey> {
  try {
    const res = await esClient.get<GetResponse<FleetServerEnrollmentAPIKey>>({
      index: ENROLLMENT_API_KEYS_INDEX,
      id,
    });

    return esDocToEnrollmentApiKey(res.body);
  } catch (e) {
    if (e instanceof ResponseError && e.statusCode === 404) {
      throw Boom.notFound(`Enrollment api key ${id} not found`);
    }

    throw e;
  }
}

/**
 * Invalidate an api key and mark it as inactive
 * @param soClient
 * @param id
 */
export async function deleteEnrollmentApiKey(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  id: string
) {
  const enrollmentApiKey = await getEnrollmentAPIKey(esClient, id);

  await invalidateAPIKeys(soClient, [enrollmentApiKey.api_key_id]);

  await esClient.update({
    index: ENROLLMENT_API_KEYS_INDEX,
    id,
    body: {
      doc: {
        active: false,
      },
    },
    refresh: 'wait_for',
  });
}

export async function deleteEnrollmentApiKeyForAgentPolicyId(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  agentPolicyId: string
) {
  let hasMore = true;
  let page = 1;
  while (hasMore) {
    const { items } = await listEnrollmentApiKeys(esClient, {
      page: page++,
      perPage: 100,
      kuery: `policy_id:${agentPolicyId}`,
    });

    if (items.length === 0) {
      hasMore = false;
    }

    for (const apiKey of items) {
      await deleteEnrollmentApiKey(soClient, esClient, apiKey.id);
    }
  }
}

export async function generateEnrollmentAPIKey(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  data: {
    name?: string;
    expiration?: string;
    agentPolicyId?: string;
  }
): Promise<EnrollmentAPIKey> {
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

  const body = {
    active: true,
    api_key_id: key.id,
    api_key: apiKey,
    name,
    policy_id: agentPolicyId,
    created_at: new Date().toISOString(),
  };

  const res = await esClient.create({
    index: ENROLLMENT_API_KEYS_INDEX,
    body,
    id,
    refresh: 'wait_for',
  });

  return {
    id: res.body._id,
    ...body,
  };
}

export async function getEnrollmentAPIKeyById(esClient: ElasticsearchClient, apiKeyId: string) {
  const res = await esClient.search<SearchResponse<FleetServerEnrollmentAPIKey, {}>>({
    index: ENROLLMENT_API_KEYS_INDEX,
    q: `api_key_id:${escapeSearchQueryPhrase(apiKeyId)}`,
  });

  const [enrollmentAPIKey] = res.body.hits.hits.map(esDocToEnrollmentApiKey);

  if (enrollmentAPIKey?.api_key_id !== apiKeyId) {
    throw new Error('find enrollmentKeyById returned an incorrect key');
  }

  return enrollmentAPIKey;
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

function esDocToEnrollmentApiKey(doc: {
  _id: string;
  _source: FleetServerEnrollmentAPIKey;
}): EnrollmentAPIKey {
  return {
    id: doc._id,
    ...doc._source,
    created_at: doc._source.created_at as string,
    active: doc._source.active || false,
  };
}
