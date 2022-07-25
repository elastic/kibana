/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { CONNECTORS_INDEX } from '../..';
import { ConnectorStatus } from '../../../common/types/connectors';
import { ErrorCode } from '../../../common/types/error_codes';

import { setupConnectorsIndices } from '../../index_management/setup_indices';

import { addConnector } from './add_connector';
import { fetchConnectorByIndexName } from './fetch_connectors';

jest.mock('../../index_management/setup_indices', () => ({
  setupConnectorsIndices: jest.fn(),
}));

jest.mock('./fetch_connectors', () => ({ fetchConnectorByIndexName: jest.fn() }));

describe('addConnector lib function', () => {
  const mockClient = {
    asCurrentUser: {
      delete: jest.fn(),
      index: jest.fn(),
      indices: {
        create: jest.fn(),
        exists: jest.fn(),
        refresh: jest.fn(),
      },
    },
    asInternalUser: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should add connector', async () => {
    mockClient.asCurrentUser.index.mockImplementation(() => ({ _id: 'fakeId' }));
    mockClient.asCurrentUser.indices.exists.mockImplementation(() => false);
    (fetchConnectorByIndexName as jest.Mock).mockImplementation(() => undefined);

    await expect(
      addConnector(mockClient as unknown as IScopedClusterClient, {
        index_name: 'index_name',
        language: 'en',
      })
    ).resolves.toEqual({ id: 'fakeId', index_name: 'index_name' });
    expect(mockClient.asCurrentUser.index).toHaveBeenCalledWith({
      document: {
        api_key_id: null,
        configuration: {},
        index_name: 'index_name',
        language: 'en',
        last_seen: null,
        last_sync_error: null,
        last_sync_status: null,
        last_synced: null,
        name: 'index_name',
        scheduling: { enabled: false, interval: '0 0 0 * * ?' },
        service_type: null,
        status: ConnectorStatus.CREATED,
        sync_now: false,
      },
      index: CONNECTORS_INDEX,
    });
    expect(mockClient.asCurrentUser.indices.create).toHaveBeenCalledWith({ index: 'index_name' });
  });

  it('should reject if index already exists', async () => {
    mockClient.asCurrentUser.index.mockImplementation(() => ({ _id: 'fakeId' }));
    mockClient.asCurrentUser.indices.exists.mockImplementation(() => true);
    (fetchConnectorByIndexName as jest.Mock).mockImplementation(() => undefined);

    await expect(
      addConnector(mockClient as unknown as IScopedClusterClient, {
        index_name: 'index_name',
        language: 'en',
      })
    ).rejects.toEqual(new Error(ErrorCode.INDEX_ALREADY_EXISTS));
    expect(mockClient.asCurrentUser.indices.create).not.toHaveBeenCalled();
  });

  it('should reject if connector already exists', async () => {
    mockClient.asCurrentUser.index.mockImplementation(() => ({ _id: 'fakeId' }));
    mockClient.asCurrentUser.indices.exists.mockImplementation(() => false);
    (fetchConnectorByIndexName as jest.Mock).mockImplementation(() => true);

    await expect(
      addConnector(mockClient as unknown as IScopedClusterClient, {
        index_name: 'index_name',
        language: 'en',
      })
    ).rejects.toEqual(new Error(ErrorCode.CONNECTOR_DOCUMENT_ALREADY_EXISTS));
    expect(mockClient.asCurrentUser.indices.create).not.toHaveBeenCalled();
  });

  it('should reject with index already exists if connector and index already exist', async () => {
    mockClient.asCurrentUser.index.mockImplementation(() => ({ _id: 'fakeId' }));
    mockClient.asCurrentUser.indices.exists.mockImplementation(() => true);
    (fetchConnectorByIndexName as jest.Mock).mockImplementation(() => true);

    await expect(
      addConnector(mockClient as unknown as IScopedClusterClient, {
        index_name: 'index_name',
        language: 'en',
      })
    ).rejects.toEqual(new Error(ErrorCode.INDEX_ALREADY_EXISTS));
    expect(mockClient.asCurrentUser.indices.create).not.toHaveBeenCalled();
  });

  it('should replace connector if deleteExistingConnector flag is true', async () => {
    mockClient.asCurrentUser.index.mockImplementation(() => ({ _id: 'fakeId' }));
    mockClient.asCurrentUser.indices.exists.mockImplementation(() => false);
    (fetchConnectorByIndexName as jest.Mock).mockImplementation(() => ({ id: 'connectorId' }));

    await expect(
      addConnector(mockClient as unknown as IScopedClusterClient, {
        delete_existing_connector: true,
        index_name: 'index_name',
        language: null,
      })
    ).resolves.toEqual({ id: 'fakeId', index_name: 'index_name' });
    expect(mockClient.asCurrentUser.delete).toHaveBeenCalledWith({
      id: 'connectorId',
      index: CONNECTORS_INDEX,
    });
    expect(mockClient.asCurrentUser.index).toHaveBeenCalledWith({
      document: {
        api_key_id: null,
        configuration: {},
        index_name: 'index_name',
        language: null,
        last_seen: null,
        last_sync_error: null,
        last_sync_status: null,
        last_synced: null,
        name: 'index_name',
        scheduling: { enabled: false, interval: '0 0 0 * * ?' },
        service_type: null,
        status: ConnectorStatus.CREATED,
        sync_now: false,
      },
      index: CONNECTORS_INDEX,
    });
    expect(mockClient.asCurrentUser.indices.create).toHaveBeenCalledWith({ index: 'index_name' });
  });

  it('should create index if no connectors index exists', async () => {
    mockClient.asCurrentUser.index.mockImplementationOnce(() => {
      return Promise.reject({
        meta: { body: { error: { type: 'index_not_found_exception' } } },
        statusCode: 404,
      });
    });
    mockClient.asCurrentUser.indices.exists.mockImplementation(() => false);
    (fetchConnectorByIndexName as jest.Mock).mockImplementation(() => false);
    await expect(
      addConnector(mockClient as unknown as IScopedClusterClient, {
        index_name: 'search-index_name',
        language: 'en',
      })
    ).resolves.toEqual({ id: 'fakeId', index_name: 'search-index_name' });
    expect(setupConnectorsIndices as jest.Mock).toHaveBeenCalledWith(mockClient.asCurrentUser);
    expect(mockClient.asCurrentUser.index).toHaveBeenCalledWith({
      document: {
        api_key_id: null,
        configuration: {},
        index_name: 'search-index_name',
        language: 'en',
        last_seen: null,
        last_sync_error: null,
        last_sync_status: null,
        last_synced: null,
        name: 'index_name',
        scheduling: { enabled: false, interval: '0 0 0 * * ?' },
        service_type: null,
        status: ConnectorStatus.CREATED,
        sync_now: false,
      },
      index: CONNECTORS_INDEX,
    });
    expect(mockClient.asCurrentUser.indices.create).toHaveBeenCalledWith({
      index: 'search-index_name',
    });
  });
  it('should not create index if status code is not 404', async () => {
    mockClient.asCurrentUser.index.mockImplementationOnce(() => {
      return Promise.reject({ statusCode: 500 });
    });
    mockClient.asCurrentUser.indices.exists.mockImplementation(() => false);
    (fetchConnectorByIndexName as jest.Mock).mockImplementation(() => false);
    await expect(
      addConnector(mockClient as unknown as IScopedClusterClient, {
        index_name: 'index_name',
        language: 'en',
      })
    ).rejects.toEqual({ statusCode: 500 });
    expect(setupConnectorsIndices).not.toHaveBeenCalled();
    expect(mockClient.asCurrentUser.index).toHaveBeenCalledTimes(1);
  });
});
