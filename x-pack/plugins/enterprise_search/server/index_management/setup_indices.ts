/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesIndexSettings, MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core/server';

import { CONNECTORS_INDEX } from '..';
import { isResourceAlreadyExistsException } from '../utils/identify_exceptions';

export enum SETUP_ERRORS {
  'insufficient_permissions',
  'index_already_exists',
}

interface IndexDefinition {
  aliases: string[];
  mappings: MappingTypeMapping;
  name: string;
  settings: IndicesIndexSettings;
}

const indices: IndexDefinition[] = [
  {
    aliases: ['.elastic-connectors'],
    mappings: {
      _meta: {
        version: '1',
      },
      properties: {
        api_key_id: {
          type: 'keyword',
        },
        configuration: {
          type: 'object',
        },
        error: { type: 'keyword' },
        index_name: { type: 'text' },
        language: { type: 'keyword' },
        last_seen: { type: 'date' },
        last_sync_error: { type: 'keyword' },
        last_sync_status: { type: 'keyword' },
        last_synced: { type: 'date' },
        scheduling: {
          properties: {
            enabled: { type: 'boolean' },
            interval: { type: 'text' },
          },
        },
        service_type: { type: 'keyword' },
        status: { type: 'keyword' },
        sync_now: { type: 'boolean' },
      },
    },
    name: '.elastic-connectors-v1',
    settings: {
      hidden: true,
    },
  },
  {
    aliases: ['.elastic-connectors-sync-jobs'],
    mappings: {
      _meta: {
        version: '1',
      },
      properties: {
        api_key_id: {
          type: 'keyword',
        },
        configuration: {
          type: 'object',
        },
        error: { type: 'keyword' },
        index_name: { type: 'text' },
        language: { type: 'keyword' },
        last_seen: { type: 'date' },
        last_sync_error: { type: 'keyword' },
        last_sync_status: { type: 'keyword' },
        last_synced: { type: 'date' },
        scheduling: {
          properties: {
            enabled: { type: 'boolean' },
            interval: { type: 'text' },
          },
        },
        service_type: { type: 'keyword' },
        status: { type: 'keyword' },
        sync_now: { type: 'boolean' },
      },
    },
    name: '.elastic-connectors-sync-jobs-v1',
    settings: {
      hidden: true,
    },
  },
];

const createConnectorsIndex = async (
  client: ElasticsearchClient,
  indexDefinition: IndexDefinition
) => {
  try {
    const { aliases, mappings, name: index, settings } = indexDefinition;
    await client.indices.create({
      index,
      mappings,
      settings,
    });
    await client.indices.updateAliases({
      actions: [
        {
          add: {
            aliases,
            index,
            is_hidden: true,
            is_write_index: true,
          },
        },
      ],
    });
  } catch (error) {
    if (isResourceAlreadyExistsException(error)) {
      // We hit a race condition, do nothing
      return;
    }
    return error;
  }
};

export const setupConnectorsIndices = async (client: ElasticsearchClient) => {
  const connectorsIndexResponse = await client.indices.get({
    index: `${CONNECTORS_INDEX}*`,
  });
  for (const indexDefinition of indices) {
    if (!connectorsIndexResponse[indexDefinition.name]) {
      await createConnectorsIndex(client, indexDefinition);
    }
    // TODO handle migrations once we start migrating stuff
  }
};
