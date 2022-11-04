/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

import { CONNECTORS_INDEX, CONNECTORS_JOBS_INDEX } from '../..';
import { SyncStatus } from '../../../common/types/connectors';

export const cancelSyncs = async (
  client: IScopedClusterClient,
  connectorId: string
): Promise<void> => {
  await client.asCurrentUser.updateByQuery({
    index: CONNECTORS_JOBS_INDEX,
    query: {
      bool: {
        must: [
          {
            term: {
              connector_id: connectorId,
            },
          },
          {
            terms: {
              status: [SyncStatus.PENDING, SyncStatus.SUSPENDED],
            },
          },
        ],
      },
    },
    refresh: true,
    script: {
      lang: 'painless',
      source: `ctx._source['status'] = '${SyncStatus.CANCELED}'`,
    },
  });
  await client.asCurrentUser.updateByQuery({
    index: CONNECTORS_JOBS_INDEX,
    query: {
      bool: {
        must: [
          {
            term: {
              connector_id: connectorId,
            },
          },
          {
            terms: {
              status: [SyncStatus.IN_PROGRESS],
            },
          },
        ],
      },
    },
    refresh: true,
    script: {
      lang: 'painless',
      source: `ctx._source['status'] = '${SyncStatus.CANCELING}'`,
    },
  });
  await client.asCurrentUser.update({
    doc: { last_sync_status: SyncStatus.CANCELED, sync_now: false },
    id: connectorId,
    index: CONNECTORS_INDEX,
    refresh: true,
  });
};
