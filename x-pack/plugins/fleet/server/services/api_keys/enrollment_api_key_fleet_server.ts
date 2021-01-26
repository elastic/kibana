/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import Boom from '@hapi/boom';
import { ResponseError } from '@elastic/elasticsearch/lib/errors';
import { SavedObjectsClientContract, ElasticsearchClient } from 'src/core/server';
import { EnrollmentAPIKey, FleetServerEnrollmentAPIKey } from '../../types';
import { ENROLLMENT_API_KEYS_INDEX } from '../../constants';
import { createAPIKey, invalidateAPIKeys } from './security';
import { agentPolicyService } from '../agent_policy';

// TODO Move these types to another file
interface SearchResponse<T> {
  took: number;
  timed_out: boolean;
  _scroll_id?: string;
  hits: {
    total: {
      value: number;
      relation: string;
    };
    max_score: number;
    hits: Array<{
      _index: string;
      _type: string;
      _id: string;
      _score: number;
      _source: T;
      _version?: number;
      fields?: any;
      highlight?: any;
      inner_hits?: any;
      matched_queries?: string[];
      sort?: string[];
    }>;
  };
}

type SearchHit<T> = SearchResponse<T>['hits']['hits'][0];

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

  const res = await esClient.search<SearchResponse<FleetServerEnrollmentAPIKey>>({
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
    const res = await esClient.get<SearchHit<FleetServerEnrollmentAPIKey>>({
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
  agentPolicyId: string
) {
  throw new Error('NOT IMPLEMENTED');
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

function esDocToEnrollmentApiKey(doc: SearchHit<FleetServerEnrollmentAPIKey>): EnrollmentAPIKey {
  return {
    id: doc._id,
    ...doc._source,
    created_at: doc._source.created_at as string,
    active: doc._source.active || false,
  };
}
