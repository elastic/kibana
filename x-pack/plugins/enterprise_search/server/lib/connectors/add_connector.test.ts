/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { CONNECTORS_INDEX } from '../..';

import { addConnector } from './add_connector';

describe('addConnector lib function', () => {
  const mockClient = {
    asCurrentUser: {
      index: jest.fn(),
      indices: {
        create: jest.fn(),
      },
    },
    asInternalUser: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should add connector', async () => {
    mockClient.asCurrentUser.index.mockImplementation(() => ({ _id: 'fakeId' }));

    await expect(
      addConnector(mockClient as unknown as IScopedClusterClient, { index_name: 'index_name' })
    ).resolves.toEqual({ id: 'fakeId', index_name: 'index_name' });
    expect(mockClient.asCurrentUser.index).toHaveBeenCalledWith({
      document: {
        api_key_id: null,
        configuration: {},
        created_at: null,
        index_name: 'index_name',
        last_seen: null,
        last_synced: null,
        scheduling: { enabled: false, interval: null },
        service_type: null,
        status: 'not connected',
        sync_error: null,
        sync_now: false,
        sync_status: null,
      },
      index: CONNECTORS_INDEX,
    });
    expect(mockClient.asCurrentUser.indices.create).toHaveBeenCalledWith({ index: 'index_name' });
  });

  it('should create index if no connectors index exists', async () => {
    mockClient.asCurrentUser.index.mockImplementationOnce(() => {
      return Promise.reject({ statusCode: 404 });
    });
    await expect(
      addConnector(mockClient as unknown as IScopedClusterClient, { index_name: 'index_name' })
    ).resolves.toEqual({ id: 'fakeId', index_name: 'index_name' });
    expect(mockClient.asCurrentUser.indices.create).toHaveBeenCalledWith({
      index: CONNECTORS_INDEX,
    });
    expect(mockClient.asCurrentUser.index).toHaveBeenCalledWith({
      document: {
        api_key_id: null,
        configuration: {},
        created_at: null,
        index_name: 'index_name',
        last_seen: null,
        last_synced: null,
        scheduling: { enabled: false, interval: null },
        service_type: null,
        status: 'not connected',
        sync_error: null,
        sync_now: false,
        sync_status: null,
      },
      index: CONNECTORS_INDEX,
    });
    expect(mockClient.asCurrentUser.index).toHaveBeenCalledTimes(2);
  });
  it('should not create index if status code is not 404', async () => {
    mockClient.asCurrentUser.index.mockImplementationOnce(() => {
      return Promise.reject({ statusCode: 500 });
    });
    await expect(
      addConnector(mockClient as unknown as IScopedClusterClient, { index_name: 'index_name' })
    ).rejects.toEqual({ statusCode: 500 });
    expect(mockClient.asCurrentUser.indices.create).not.toHaveBeenCalled();
    expect(mockClient.asCurrentUser.index).toHaveBeenCalledTimes(1);
  });
});
