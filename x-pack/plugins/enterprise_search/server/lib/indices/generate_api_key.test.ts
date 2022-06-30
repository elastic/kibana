/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { CONNECTORS_INDEX } from '../..';

import { generateApiKey } from './generate_api_key';

describe('generateApiKey lib function', () => {
  const mockClient = {
    asCurrentUser: {
      indices: {
        create: jest.fn(),
      },
      index: jest.fn(),
      search: jest.fn(),
      security: {
        createApiKey: jest.fn(),
        invalidateApiKey: jest.fn(),
      },
    },
    asInternalUser: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create an API key if index does not have a connector', async () => {
    mockClient.asCurrentUser.search.mockImplementation(() =>
      Promise.resolve({
        hits: {
          hits: [],
        },
      })
    );
    mockClient.asCurrentUser.index.mockImplementation(() => ({
      _id: 'connectorId',
      _source: 'Document',
    }));
    mockClient.asCurrentUser.security.createApiKey.mockImplementation(() => ({
      id: 'apiKeyId',
      encoded: 'encoded',
    }));

    await expect(
      generateApiKey(mockClient as unknown as IScopedClusterClient, 'index_name')
    ).resolves.toEqual({ id: 'apiKeyId', encoded: 'encoded' });
    expect(mockClient.asCurrentUser.index).not.toHaveBeenCalled();
    expect(mockClient.asCurrentUser.security.createApiKey).toHaveBeenCalledWith({
      name: 'index_name-connector',
      role_descriptors: {
        ['index_name-connector-role']: {
          cluster: [],
          index: [
            {
              names: ['index_name', CONNECTORS_INDEX],
              privileges: ['all'],
            },
          ],
        },
      },
    });
  });
  it('should create an API key plus connector for connectors', async () => {
    mockClient.asCurrentUser.search.mockImplementation(() =>
      Promise.resolve({
        hits: {
          hits: [{ _source: { doc: 'doc' }, _id: 'connectorId' }],
        },
      })
    );
    mockClient.asCurrentUser.index.mockImplementation(() => ({
      _id: 'connectorId',
      _source: 'Document',
    }));
    mockClient.asCurrentUser.security.createApiKey.mockImplementation(() => ({
      id: 'apiKeyId',
      encoded: 'encoded',
    }));

    await expect(
      generateApiKey(mockClient as unknown as IScopedClusterClient, 'index_name')
    ).resolves.toEqual({ id: 'apiKeyId', encoded: 'encoded' });
    expect(mockClient.asCurrentUser.security.createApiKey).toHaveBeenCalledWith({
      name: 'index_name-connector',
      role_descriptors: {
        ['index_name-connector-role']: {
          cluster: [],
          index: [
            {
              names: ['index_name', CONNECTORS_INDEX],
              privileges: ['all'],
            },
          ],
        },
      },
    });
    expect(mockClient.asCurrentUser.index).toHaveBeenCalledWith({
      index: CONNECTORS_INDEX,
      id: 'connectorId',
      document: { doc: 'doc', api_key_id: 'apiKeyId' },
    });
    expect(mockClient.asCurrentUser.security.invalidateApiKey).not.toHaveBeenCalled();
  });
  it('should invalidate API key if already defined', async () => {
    mockClient.asCurrentUser.search.mockImplementation(() =>
      Promise.resolve({
        hits: {
          hits: [
            {
              _source: { doc: 'doc', api_key_id: '1' },
              _id: 'connectorId',
              fields: { api_key_id: '1' },
            },
          ],
        },
      })
    );
    mockClient.asCurrentUser.index.mockImplementation(() => ({
      _id: 'connectorId',
      _source: 'Document',
    }));
    mockClient.asCurrentUser.security.createApiKey.mockImplementation(() => ({
      id: 'apiKeyId',
      encoded: 'encoded',
    }));

    await expect(
      generateApiKey(mockClient as unknown as IScopedClusterClient, 'index_name')
    ).resolves.toEqual({ id: 'apiKeyId', encoded: 'encoded' });
    expect(mockClient.asCurrentUser.security.createApiKey).toHaveBeenCalledWith({
      name: 'index_name-connector',
      role_descriptors: {
        ['index_name-connector-role']: {
          cluster: [],
          index: [
            {
              names: ['index_name', CONNECTORS_INDEX],
              privileges: ['all'],
            },
          ],
        },
      },
    });
    expect(mockClient.asCurrentUser.index).toHaveBeenCalledWith({
      index: CONNECTORS_INDEX,
      id: 'connectorId',
      document: { doc: 'doc', api_key_id: 'apiKeyId' },
    });
    expect(mockClient.asCurrentUser.security.invalidateApiKey).toHaveBeenCalledWith({
      id: '1',
    });
  });
});
