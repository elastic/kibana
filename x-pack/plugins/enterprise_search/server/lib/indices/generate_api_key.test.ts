/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import {
  CONNECTORS_INDEX,
  createConnectorSecret,
  updateConnectorSecret,
} from '@kbn/search-connectors';

import { generateApiKey } from './generate_api_key';

jest.mock('@kbn/search-connectors', () => ({
  CONNECTORS_ACCESS_CONTROL_INDEX_PREFIX: '.search-acl-filter-',
  CONNECTORS_INDEX: '.elastic-connectors',
  createConnectorSecret: jest.fn(),
  updateConnectorSecret: jest.fn(),
}));

describe('generateApiKey lib function for connector clients', () => {
  const mockClient = {
    asCurrentUser: {
      index: jest.fn(),
      indices: {
        create: jest.fn(),
      },
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
      encoded: 'encoded',
      id: 'apiKeyId',
    }));
    (createConnectorSecret as jest.Mock).mockImplementation(() => undefined);
    (updateConnectorSecret as jest.Mock).mockImplementation(() => undefined);

    await expect(
      generateApiKey(mockClient as unknown as IScopedClusterClient, 'index_name', false)
    ).resolves.toEqual({ encoded: 'encoded', id: 'apiKeyId' });
    expect(mockClient.asCurrentUser.index).not.toHaveBeenCalled();
    expect(mockClient.asCurrentUser.security.createApiKey).toHaveBeenCalledWith({
      name: 'index_name-connector',
      role_descriptors: {
        ['index-name-connector-role']: {
          cluster: ['monitor'],
          index: [
            {
              names: ['index_name', '.search-acl-filter-index_name', `${CONNECTORS_INDEX}*`],
              privileges: ['all'],
            },
          ],
        },
      },
    });
    expect(createConnectorSecret).toBeCalledTimes(0);
    expect(updateConnectorSecret).toBeCalledTimes(0);
  });
  it('should create an API key plus connector for connectors', async () => {
    mockClient.asCurrentUser.search.mockImplementation(() =>
      Promise.resolve({
        hits: {
          hits: [{ _id: 'connectorId', _source: { doc: 'doc' } }],
        },
      })
    );
    mockClient.asCurrentUser.index.mockImplementation(() => ({
      _id: 'connectorId',
      _source: 'Document',
    }));
    mockClient.asCurrentUser.security.createApiKey.mockImplementation(() => ({
      encoded: 'encoded',
      id: 'apiKeyId',
    }));
    (createConnectorSecret as jest.Mock).mockImplementation(() => undefined);
    (updateConnectorSecret as jest.Mock).mockImplementation(() => undefined);

    await expect(
      generateApiKey(mockClient as unknown as IScopedClusterClient, 'search-test', false)
    ).resolves.toEqual({ encoded: 'encoded', id: 'apiKeyId' });
    expect(mockClient.asCurrentUser.security.createApiKey).toHaveBeenCalledWith({
      name: 'search-test-connector',
      role_descriptors: {
        ['search-test-connector-role']: {
          cluster: ['monitor'],
          index: [
            {
              names: ['search-test', '.search-acl-filter-search-test', `${CONNECTORS_INDEX}*`],
              privileges: ['all'],
            },
          ],
        },
      },
    });
    expect(mockClient.asCurrentUser.index).toHaveBeenCalledWith({
      document: { api_key_id: 'apiKeyId', doc: 'doc' },
      id: 'connectorId',
      index: CONNECTORS_INDEX,
    });
    expect(mockClient.asCurrentUser.security.invalidateApiKey).not.toHaveBeenCalled();
    expect(createConnectorSecret).toBeCalledTimes(0);
    expect(updateConnectorSecret).toBeCalledTimes(0);
  });
  it('should invalidate API key if already defined', async () => {
    mockClient.asCurrentUser.search.mockImplementation(() =>
      Promise.resolve({
        hits: {
          hits: [
            {
              _id: 'connectorId',
              _source: { api_key_id: '1', doc: 'doc' },
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
      encoded: 'encoded',
      id: 'apiKeyId',
    }));
    (createConnectorSecret as jest.Mock).mockImplementation(() => undefined);
    (updateConnectorSecret as jest.Mock).mockImplementation(() => undefined);

    await expect(
      generateApiKey(mockClient as unknown as IScopedClusterClient, 'index_name', false)
    ).resolves.toEqual({ encoded: 'encoded', id: 'apiKeyId' });
    expect(mockClient.asCurrentUser.security.createApiKey).toHaveBeenCalledWith({
      name: 'index_name-connector',
      role_descriptors: {
        ['index-name-connector-role']: {
          cluster: ['monitor'],
          index: [
            {
              names: ['index_name', '.search-acl-filter-index_name', `${CONNECTORS_INDEX}*`],
              privileges: ['all'],
            },
          ],
        },
      },
    });
    expect(mockClient.asCurrentUser.index).toHaveBeenCalledWith({
      document: { api_key_id: 'apiKeyId', doc: 'doc' },
      id: 'connectorId',
      index: CONNECTORS_INDEX,
    });
    expect(mockClient.asCurrentUser.security.invalidateApiKey).toHaveBeenCalledWith({
      ids: ['1'],
    });
    expect(createConnectorSecret).toBeCalledTimes(0);
    expect(updateConnectorSecret).toBeCalledTimes(0);
  });
});

describe('generateApiKey lib function for native connectors', () => {
  const mockClient = {
    asCurrentUser: {
      index: jest.fn(),
      indices: {
        create: jest.fn(),
      },
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
      encoded: 'encoded',
      id: 'apiKeyId',
    }));
    (createConnectorSecret as jest.Mock).mockImplementation(() => undefined);
    (updateConnectorSecret as jest.Mock).mockImplementation(() => undefined);

    await expect(
      generateApiKey(mockClient as unknown as IScopedClusterClient, 'index_name', true)
    ).resolves.toEqual({ encoded: 'encoded', id: 'apiKeyId' });
    expect(mockClient.asCurrentUser.index).not.toHaveBeenCalled();
    expect(mockClient.asCurrentUser.security.createApiKey).toHaveBeenCalledWith({
      name: 'index_name-connector',
      role_descriptors: {
        ['index-name-connector-role']: {
          cluster: ['monitor'],
          index: [
            {
              names: ['index_name', '.search-acl-filter-index_name', `${CONNECTORS_INDEX}*`],
              privileges: ['all'],
            },
          ],
        },
      },
    });
    expect(createConnectorSecret).toBeCalledTimes(0);
    expect(updateConnectorSecret).toBeCalledTimes(0);
  });
  it('should create an API key plus connector for connectors', async () => {
    mockClient.asCurrentUser.search.mockImplementation(() =>
      Promise.resolve({
        hits: {
          hits: [{ _id: 'connectorId', _source: { doc: 'doc' } }],
        },
      })
    );
    mockClient.asCurrentUser.index.mockImplementation(() => ({
      _id: 'connectorId',
      _source: 'Document',
    }));
    mockClient.asCurrentUser.security.createApiKey.mockImplementation(() => ({
      encoded: 'encoded',
      id: 'apiKeyId',
    }));
    (createConnectorSecret as jest.Mock).mockImplementation(() => ({
      id: '1234',
    }));
    (updateConnectorSecret as jest.Mock).mockImplementation(() => undefined);

    await expect(
      generateApiKey(mockClient as unknown as IScopedClusterClient, 'search-test', true)
    ).resolves.toEqual({ encoded: 'encoded', id: 'apiKeyId' });
    expect(mockClient.asCurrentUser.security.createApiKey).toHaveBeenCalledWith({
      name: 'search-test-connector',
      role_descriptors: {
        ['search-test-connector-role']: {
          cluster: ['monitor'],
          index: [
            {
              names: ['search-test', '.search-acl-filter-search-test', `${CONNECTORS_INDEX}*`],
              privileges: ['all'],
            },
          ],
        },
      },
    });
    expect(mockClient.asCurrentUser.index).toHaveBeenCalledWith({
      document: { api_key_id: 'apiKeyId', api_key_secret_id: '1234', doc: 'doc' },
      id: 'connectorId',
      index: CONNECTORS_INDEX,
    });
    expect(mockClient.asCurrentUser.security.invalidateApiKey).not.toHaveBeenCalled();
    expect(createConnectorSecret).toHaveBeenCalledWith(mockClient.asCurrentUser, 'encoded');
    expect(updateConnectorSecret).toBeCalledTimes(0);
  });
  it('should invalidate API key if already defined', async () => {
    mockClient.asCurrentUser.search.mockImplementation(() =>
      Promise.resolve({
        hits: {
          hits: [
            {
              _id: 'connectorId',
              _source: { api_key_id: '1', api_key_secret_id: '2', doc: 'doc' },
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
      encoded: 'encoded',
      id: 'apiKeyId',
    }));
    (createConnectorSecret as jest.Mock).mockImplementation(() => undefined);
    (updateConnectorSecret as jest.Mock).mockImplementation(() => ({
      result: 'updated',
    }));

    await expect(
      generateApiKey(mockClient as unknown as IScopedClusterClient, 'index_name', true)
    ).resolves.toEqual({ encoded: 'encoded', id: 'apiKeyId' });
    expect(mockClient.asCurrentUser.security.createApiKey).toHaveBeenCalledWith({
      name: 'index_name-connector',
      role_descriptors: {
        ['index-name-connector-role']: {
          cluster: ['monitor'],
          index: [
            {
              names: ['index_name', '.search-acl-filter-index_name', `${CONNECTORS_INDEX}*`],
              privileges: ['all'],
            },
          ],
        },
      },
    });
    expect(mockClient.asCurrentUser.index).toHaveBeenCalledWith({
      document: { api_key_id: 'apiKeyId', api_key_secret_id: '2', doc: 'doc' },
      id: 'connectorId',
      index: CONNECTORS_INDEX,
    });
    expect(mockClient.asCurrentUser.security.invalidateApiKey).toHaveBeenCalledWith({
      ids: ['1'],
    });
    expect(createConnectorSecret).toBeCalledTimes(0);
    expect(updateConnectorSecret).toHaveBeenCalledWith(mockClient.asCurrentUser, 'encoded', '2');
  });
});
