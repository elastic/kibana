/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { CONNECTORS_JOBS_INDEX } from '../..';
import { SyncStatus } from '../../../common/types/connectors';

import { cancelSyncs } from './post_cancel_syncs';

describe('addConnector lib function', () => {
  const mockClient = {
    asCurrentUser: {
      updateByQuery: jest.fn(),
    },
    asInternalUser: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
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
                connector_id: 'connectorId',
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
      script: {
        lang: 'painless',
        source: `ctx._source['status'] = '${SyncStatus.CANCELING}'`,
      },
    });
    expect(mockClient.asCurrentUser.updateByQuery).toHaveBeenCalledWith({
      index: CONNECTORS_JOBS_INDEX,
      query: {
        bool: {
          must: [
            {
              term: {
                connector_id: 'connectorId',
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
      script: {
        lang: 'painless',
        source: `ctx._source['status'] = '${SyncStatus.CANCELED}'`,
      },
    });
  });
});
