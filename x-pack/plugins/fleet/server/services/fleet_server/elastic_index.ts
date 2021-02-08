/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import hash from 'object-hash';

import { FLEET_SERVER_INDICES } from '../../../common';
import { appContextService } from '../app_context';
import ESFleetAgentIndex from './elasticsearch/fleet_agents.json';
import ESFleetPoliciesIndex from './elasticsearch/fleet_policies.json';
import ESFleetPoliciesLeaderIndex from './elasticsearch/fleet_policies_leader.json';
import ESFleetServersIndex from './elasticsearch/fleet_servers.json';
import ESFleetEnrollmentApiKeysIndex from './elasticsearch/fleet_enrollment_api_keys.json';
import EsFleetActionsIndex from './elasticsearch/fleet_actions.json';

const INDEX_VERSION = 1;

const FLEET_INDEXES: Array<[typeof FLEET_SERVER_INDICES[number], any]> = [
  ['.fleet-actions', EsFleetActionsIndex],
  ['.fleet-agents', ESFleetAgentIndex],
  ['.fleet-enrollment-api-keys', ESFleetEnrollmentApiKeysIndex],
  ['.fleet-policies', ESFleetPoliciesIndex],
  ['.fleet-policies-leader', ESFleetPoliciesLeaderIndex],
  ['.fleet-servers', ESFleetServersIndex],
];

export async function setupFleetServerIndexes(
  esClient = appContextService.getInternalUserESClient()
) {
  await Promise.all(
    FLEET_INDEXES.map(async ([indexAlias, indexData]) => {
      const index = `${indexAlias}_${INDEX_VERSION}`;
      await createOrUpdateIndex(esClient, index, indexData);
      await createAliasIfDoNotExists(esClient, indexAlias, index);
    })
  );
}

export async function createAliasIfDoNotExists(
  esClient: ElasticsearchClient,
  alias: string,
  index: string
) {
  const { body: exists } = await esClient.indices.existsAlias({
    name: alias,
  });

  if (exists === true) {
    return;
  }
  await esClient.indices.updateAliases({
    body: {
      actions: [
        {
          add: { index, alias },
        },
      ],
    },
  });
}

async function createOrUpdateIndex(
  esClient: ElasticsearchClient,
  indexName: string,
  indexData: any
) {
  const resExists = await esClient.indices.exists({
    index: indexName,
  });

  // Support non destructive migration only (adding new field)
  if (resExists.body === true) {
    return updateIndex(esClient, indexName, indexData);
  }

  return createIndex(esClient, indexName, indexData);
}

async function updateIndex(esClient: ElasticsearchClient, indexName: string, indexData: any) {
  const res = await esClient.indices.getMapping({
    index: indexName,
  });

  const migrationHash = hash(indexData);
  if (res.body[indexName].mappings?._meta?.migrationHash !== migrationHash) {
    await esClient.indices.putMapping({
      index: indexName,
      body: Object.assign(
        {
          _meta: { migrationHash },
        },
        indexData.mappings
      ),
    });
  }
}

async function createIndex(esClient: ElasticsearchClient, indexName: string, indexData: any) {
  try {
    await esClient.indices.create({
      index: indexName,
      body: indexData,
    });
  } catch (err) {
    // Swallow already exists errors as concurent Kibana can try to create that indice
    if (err?.body?.error?.type !== 'resource_already_exists_exception') {
      throw err;
    }
  }
}
