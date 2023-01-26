/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { CONNECTORS_INDEX } from '../..';

import { updateConnectorScheduling } from './update_connector_scheduling';

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

  it('should update connector scheduling', async () => {
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
          scheduling: { enabled: false, interval: '* * * * *' },
          service_type: null,
          status: 'not connected',
          sync_now: false,
        },
        index: CONNECTORS_INDEX,
      });
    });
    mockClient.asCurrentUser.index.mockImplementation(() => ({ _id: 'fakeId' }));

    await expect(
      updateConnectorScheduling(mockClient as unknown as IScopedClusterClient, 'connectorId', {
        enabled: true,
        interval: '1 2 3 4 5',
      })
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
        sync_now: false,
      },
      id: 'connectorId',
      index: CONNECTORS_INDEX,
    });
    expect(mockClient.asCurrentUser.indices.refresh).toHaveBeenCalledWith({
      index: CONNECTORS_INDEX,
    });
  });

  it('should not index document if there is no connector', async () => {
    mockClient.asCurrentUser.get.mockImplementationOnce(() => {
      return Promise.resolve({});
    });
    await expect(
      updateConnectorScheduling(mockClient as unknown as IScopedClusterClient, 'connectorId', {
        enabled: true,
        interval: '1 2 3 4 5',
      })
    ).rejects.toEqual(new Error('Could not find document'));
    expect(mockClient.asCurrentUser.index).not.toHaveBeenCalled();
  });
});
