/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { CONNECTORS_INDEX, CONNECTORS_JOBS_INDEX } from '../..';
import { SyncStatus } from '../../../common/types/connectors';

import { cancelSyncs } from './post_cancel_syncs';

describe('addConnector lib function', () => {
  const mockClient = {
    asCurrentUser: {
      update: jest.fn(),
      updateByQuery: jest.fn(),
    },
    asInternalUser: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const now = new Date('2022-05-22T10:10:11.111Z');
    jest.spyOn(Date, 'now').mockImplementation(() => now.getTime());
  });

  it('should call updateByQuery to cancel syncs', async () => {
    mockClient.asCurrentUser.updateByQuery.mockImplementation(() => ({ _id: 'fakeId' }));

    await expect(
      cancelSyncs(mockClient as unknown as IScopedClusterClient, 'connectorId')
    ).resolves.toEqual(undefined);
    expect(mockClient.asCurrentUser.updateByQuery).toHaveBeenCalledTimes(2);
    expect(mockClient.asCurrentUser.updateByQuery).toHaveBeenCalledWith({
      index: CONNECTORS_JOBS_INDEX,
      query: {
        bool: {
          must: [
            {
              term: {
                'connector.id': 'connectorId',
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
        source: `
      ctx._source['status'] = '${SyncStatus.CANCELED}';
      ctx._source['cancelation_requested_at'] = '${new Date(Date.now()).toISOString()}';
      ctx._source['canceled_at'] = '${new Date(Date.now()).toISOString()}';
      ctx._source['completed_at'] = '${new Date(Date.now()).toISOString()}';
`,
      },
    });
    expect(mockClient.asCurrentUser.updateByQuery).toHaveBeenCalledWith({
      index: CONNECTORS_JOBS_INDEX,
      query: {
        bool: {
          must: [
            {
              term: {
                'connector.id': 'connectorId',
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
        source: `
        ctx._source['status'] = '${SyncStatus.CANCELING}'
        ctx._source['cancelation_requested_at'] = '${new Date(Date.now()).toISOString()}';
`,
      },
    });
    await expect(mockClient.asCurrentUser.update).toHaveBeenCalledWith({
      doc: { last_sync_status: SyncStatus.CANCELED, sync_now: false },
      id: 'connectorId',
      index: CONNECTORS_INDEX,
      refresh: true,
    });
  });
});
