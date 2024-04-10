/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('@kbn/search-connectors', () => ({
  fetchConnectorByIndexName: jest.fn(),
}));

import { ByteSizeValue } from '@kbn/config-schema';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { fetchConnectorByIndexName } from '@kbn/search-connectors';

import { fetchIndex } from './fetch_index';

describe('fetch index lib function', () => {
  const mockClient = {
    indices: {
      get: jest.fn(),
      stats: jest.fn(),
    },
    count: jest.fn(),
  };
  const client = () => mockClient as unknown as ElasticsearchClient;

  const indexName = 'search-regular-index';
  const regularIndexResponse = {
    'search-regular-index': {
      aliases: {},
    },
  };
  const regularIndexStatsResponse = {
    indices: {
      'search-regular-index': {
        health: 'green',
        size: new ByteSizeValue(108000).toString(),
        status: 'open',
        total: {
          docs: {
            count: 100,
            deleted: 0,
          },
          store: {
            size_in_bytes: 108000,
          },
        },
        uuid: '83a81e7e-5955-4255-b008-5d6961203f57',
      },
    },
  };
  const indexCountResponse = {
    count: 100,
  };
  const indexConnector = {
    foo: 'foo',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return index if all client calls succeed', () => {
    mockClient.indices.get.mockResolvedValue({ ...regularIndexResponse });
    mockClient.indices.stats.mockResolvedValue(regularIndexStatsResponse);
    mockClient.count.mockResolvedValue(indexCountResponse);
    (fetchConnectorByIndexName as unknown as jest.Mock).mockResolvedValue(indexConnector);

    expect(fetchIndex(client(), indexName)).resolves.toMatchObject({
      index: {
        aliases: {},
        count: 100,
        connector: indexConnector,
        stats: regularIndexStatsResponse.indices[indexName],
      },
    });
  });

  it('should throw an error if get index rejects', () => {
    const expectedError = new Error('Boom!');

    mockClient.indices.get.mockRejectedValue(expectedError);
    mockClient.indices.stats.mockResolvedValue(regularIndexStatsResponse);
    mockClient.count.mockResolvedValue(indexCountResponse);
    (fetchConnectorByIndexName as unknown as jest.Mock).mockResolvedValue(indexConnector);

    expect(fetchIndex(client(), indexName)).rejects.toEqual(expectedError);
  });

  it('should return partial data if index stats rejects', () => {
    const expectedError = new Error('Boom!');

    mockClient.indices.get.mockResolvedValue({ ...regularIndexResponse });
    mockClient.indices.stats.mockRejectedValue(expectedError);
    mockClient.count.mockResolvedValue(indexCountResponse);
    (fetchConnectorByIndexName as unknown as jest.Mock).mockResolvedValue(indexConnector);

    expect(fetchIndex(client(), indexName)).resolves.toMatchObject({
      index: {
        aliases: {},
        count: 100,
        connector: indexConnector,
      },
    });
  });

  it('should return partial data if index count rejects', () => {
    const expectedError = new Error('Boom!');

    mockClient.indices.get.mockResolvedValue({ ...regularIndexResponse });
    mockClient.indices.stats.mockResolvedValue(regularIndexStatsResponse);
    mockClient.count.mockRejectedValue(expectedError);
    (fetchConnectorByIndexName as unknown as jest.Mock).mockResolvedValue(indexConnector);

    expect(fetchIndex(client(), indexName)).resolves.toMatchObject({
      index: {
        aliases: {},
        count: 0,
        connector: indexConnector,
        stats: regularIndexStatsResponse.indices[indexName],
      },
    });
  });

  it('should return partial data if fetch connector rejects', () => {
    const expectedError = new Error('Boom!');

    mockClient.indices.get.mockResolvedValue({ ...regularIndexResponse });
    mockClient.indices.stats.mockResolvedValue(regularIndexStatsResponse);
    mockClient.count.mockResolvedValue(indexCountResponse);
    (fetchConnectorByIndexName as unknown as jest.Mock).mockRejectedValue(expectedError);

    expect(fetchIndex(client(), indexName)).resolves.toMatchObject({
      index: {
        aliases: {},
        count: 100,
        stats: regularIndexStatsResponse.indices[indexName],
      },
    });
  });
});
