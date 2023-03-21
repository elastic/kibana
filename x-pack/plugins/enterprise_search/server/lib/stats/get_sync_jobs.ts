/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import { IScopedClusterClient } from '@kbn/core/server';

import { CONNECTORS_INDEX, CONNECTORS_JOBS_INDEX } from '../..';
import { SyncJobsStats } from '../../../common/stats';

import { ConnectorStatus, SyncStatus } from '../../../common/types/connectors';

export const fetchSyncJobsStats = async (client: IScopedClusterClient): Promise<SyncJobsStats> => {
  const connectorIdsResult = await client.asCurrentUser.search({
    index: CONNECTORS_INDEX,
    scroll: '10s',
    stored_fields: [],
  });
  const ids = connectorIdsResult.hits.hits.map((hit) => hit._id);
  const orphanedJobsCountResponse = await client.asCurrentUser.count({
    index: CONNECTORS_JOBS_INDEX,
    query: {
      bool: {
        must_not: [
          {
            terms: {
              'connector.id': ids,
            },
          },
        ],
      },
    },
  });

  const inProgressJobsCountResponse = await client.asCurrentUser.count({
    index: CONNECTORS_JOBS_INDEX,
    query: {
      term: {
        status: SyncStatus.IN_PROGRESS,
      },
    },
  });

  const idleJobsCountResponse = await client.asCurrentUser.count({
    index: CONNECTORS_JOBS_INDEX,
    query: {
      bool: {
        filter: [
          {
            term: {
              status: SyncStatus.IN_PROGRESS,
            },
          },
          {
            range: {
              last_seen: {
                lt: moment().subtract(1, 'minute').toISOString(),
              },
            },
          },
        ],
      },
    },
  });

  const errorResponse = await client.asCurrentUser.count({
    index: CONNECTORS_INDEX,
    query: {
      term: {
        last_sync_status: SyncStatus.ERROR,
      },
    },
  });

  const connectedResponse = await client.asCurrentUser.count({
    index: CONNECTORS_INDEX,
    query: {
      bool: {
        filter: [
          {
            term: {
              status: ConnectorStatus.CONNECTED,
            },
          },
          {
            range: {
              last_seen: {
                gte: moment().subtract(30, 'minutes').toISOString(),
              },
            },
          },
        ],
      },
    },
  });

  const incompleteResponse = await client.asCurrentUser.count({
    index: CONNECTORS_INDEX,
    query: {
      bool: {
        should: [
          {
            bool: {
              must_not: {
                terms: {
                  status: [ConnectorStatus.CONNECTED, ConnectorStatus.ERROR],
                },
              },
            },
          },
          {
            range: {
              last_seen: {
                lt: moment().subtract(30, 'minutes').toISOString(),
              },
            },
          },
        ],
      },
    },
  });

  const response = {
    connected: connectedResponse.count,
    errors: errorResponse.count,
    idle: idleJobsCountResponse.count,
    in_progress: inProgressJobsCountResponse.count,
    incomplete: incompleteResponse.count,
    orphaned_jobs: orphanedJobsCountResponse.count,
  };

  return response;
};
