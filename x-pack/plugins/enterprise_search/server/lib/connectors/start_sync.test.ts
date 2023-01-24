/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { CONNECTORS_INDEX } from '../..';
import { ErrorCode } from '../../../common/types/error_codes';

import { startConnectorSync } from './start_sync';

describe('addConnector lib function', () => {
  const mockClient = {
    asCurrentUser: {
      get: jest.fn(),
      index: jest.fn(),
      indices: {
        refresh: jest.fn(),
      },
    },
    asInternalUser: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should start a sync', async () => {
    mockClient.asCurrentUser.get.mockImplementationOnce(() => {
      return Promise.resolve({
        _source: {
          api_key_id: null,
          configuration: {},
          created_at: null,
          error: null,
          index_name: 'index_name',
          last_seen: null,
          last_sync_error: null,
          last_sync_status: null,
          last_synced: null,
          scheduling: { enabled: true, interval: '1 2 3 4 5' },
          service_type: null,
          status: 'not connected',
          sync_now: false,
        },
        index: CONNECTORS_INDEX,
      });
    });
    mockClient.asCurrentUser.index.mockImplementation(() => ({ _id: 'fakeId' }));

    await expect(
      startConnectorSync(mockClient as unknown as IScopedClusterClient, 'connectorId')
    ).resolves.toEqual({ _id: 'fakeId' });
    expect(mockClient.asCurrentUser.index).toHaveBeenCalledWith({
      document: {
        api_key_id: null,
        configuration: {},
        created_at: null,
        error: null,
        index_name: 'index_name',
        last_seen: null,
        last_sync_error: null,
        last_sync_status: null,
        last_synced: null,
        scheduling: { enabled: true, interval: '1 2 3 4 5' },
        service_type: null,
        status: 'not connected',
        sync_now: true,
      },
      id: 'connectorId',
      index: CONNECTORS_INDEX,
    });
    expect(mockClient.asCurrentUser.indices.refresh).toHaveBeenCalledWith({
      index: CONNECTORS_INDEX,
    });
  });

  it('should not create index if there is no connector', async () => {
    mockClient.asCurrentUser.get.mockImplementationOnce(() => {
      return Promise.resolve({});
    });
    await expect(
      startConnectorSync(mockClient as unknown as IScopedClusterClient, 'connectorId')
    ).rejects.toEqual(new Error(ErrorCode.RESOURCE_NOT_FOUND));
    expect(mockClient.asCurrentUser.index).not.toHaveBeenCalled();
  });
});
