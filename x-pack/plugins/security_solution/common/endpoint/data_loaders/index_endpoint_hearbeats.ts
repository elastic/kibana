/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client, estypes } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';

import { createToolingLogger } from './utils';

export interface IndexedEndpointHeartbeats {
  data: estypes.BulkResponse;
  cleanup: () => Promise<DeletedEndpointHeartbeats>;
}

export interface DeletedEndpointHeartbeats {
  data: estypes.BulkResponse;
}

interface EndpointHeartbeat {
  '@timestamp': string;
  agent: {
    id: string;
  };
  event: {
    agent_id_status: string;
    ingested: string;
  };
  billable?: boolean;
}

export const indexEndpointHeartbeats = async (
  esClient: Client,
  log: ToolingLog,
  count: number = 1,
  unbilledCount: number = 1
): Promise<IndexedEndpointHeartbeats> => {
  log.debug(`Indexing ${count} endpoint heartbeats`);
  const startTime = new Date();

  const docs: EndpointHeartbeat[] = Array.from({ length: count }).map((_, i) => {
    const ingested = new Date(startTime.getTime() + i).toISOString();

    const heartbeatDoc: EndpointHeartbeat = {
      '@timestamp': '2024-06-11T13:03:37Z',
      agent: {
        id: `agent-${i}`,
      },
      event: {
        agent_id_status: 'auth_metadata_missing',
        ingested,
      },
    };
    // billable: true and missing billable are billed
    if (i % 2) {
      heartbeatDoc.billable = true;
    }
    return heartbeatDoc;
  });

  const unbilledDocs: EndpointHeartbeat[] = Array.from({ length: unbilledCount }).map((_, i) => {
    const ingested = new Date(startTime.getTime() + i).toISOString();

    return {
      '@timestamp': '2024-06-11T13:03:37Z',
      agent: {
        id: `agent-billable-false-${i}`,
      },
      event: {
        agent_id_status: 'auth_metadata_missing',
        ingested,
      },
      billable: false,
    };
  });

  const operations = docs.concat(unbilledDocs).flatMap((doc) => [
    {
      index: {
        // simulating different namespaces
        _index: `.logs-endpoint.heartbeat-${doc.agent.id.slice(-1)}`,
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
