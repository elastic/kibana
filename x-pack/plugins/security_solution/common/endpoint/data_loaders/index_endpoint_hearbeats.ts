/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client, estypes } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { ENDPOINT_HEARTBEAT_INDEX } from '../constants';
import { createToolingLogger } from './utils';

export interface IndexedEndpointHeartbeats {
  data: estypes.BulkResponse;
  cleanup: () => Promise<DeletedEndpointHeartbeats>;
}

export interface DeletedEndpointHeartbeats {
  data: estypes.BulkResponse;
}

export const indexEndpointHeartbeats = async (
  esClient: Client,
  log: ToolingLog,
  count: number
): Promise<IndexedEndpointHeartbeats> => {
  log.debug(`Indexing ${count} endpoint heartbeats`);
  const startTime = new Date();

  const docs = Array.from({ length: count }).map((_, i) => {
    const ingested = new Date(startTime.getTime() + i).toISOString();

    return {
      '@timestamp': '2024-06-11T13:03:37Z',
      agent: {
        id: `agent-${i}`,
      },
      event: {
        agent_id_status: 'auth_metadata_missing',
        ingested,
      },
    };
  });

  const operations = docs.flatMap((doc) => [
    {
      index: {
        _index: ENDPOINT_HEARTBEAT_INDEX,
        op_type: 'create',
      },
    },
    doc,
  ]);

  const response = await esClient.bulk({
    refresh: 'wait_for',
    operations,
  });

  if (response.errors) {
    log.error(
      `There was an error indexing endpoint heartbeats ${JSON.stringify(response.items, null, 2)}`
    );
  } else {
    log.debug(`Indexed ${docs.length} endpoint heartbeats successfully`);
  }

  return {
    data: response,
    cleanup: deleteIndexedEndpointHeartbeats.bind(null, esClient, response, log),
  };
};

export const deleteIndexedEndpointHeartbeats = async (
  esClient: Client,
  indexedHeartbeats: IndexedEndpointHeartbeats['data'],
  log = createToolingLogger()
): Promise<DeletedEndpointHeartbeats> => {
  let response: estypes.BulkResponse = {
    took: 0,
    errors: false,
    items: [],
  };

  if (indexedHeartbeats.items.length) {
    const idsToDelete = indexedHeartbeats.items
      .filter((item) => item.create)
      .map((item) => ({
        delete: {
          _index: item.create?._index,
          _id: item.create?._id,
        },
      }));

    if (idsToDelete.length) {
      response = await esClient.bulk({
        operations: idsToDelete,
      });
      log.debug('Indexed endpoint heartbeats deleted successfully');
    }
  }

  return { data: response };
};
