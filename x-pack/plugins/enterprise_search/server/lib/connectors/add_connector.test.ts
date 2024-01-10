/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import {
  createConnector,
  fetchConnectorByIndexName,
  deleteConnectorById,
} from '@kbn/search-connectors';

import { ErrorCode } from '../../../common/types/error_codes';

import { fetchCrawlerByIndexName } from '../crawler/fetch_crawlers';
import { textAnalysisSettings } from '../indices/text_analysis';

import { addConnector } from './add_connector';

jest.mock('@kbn/search-connectors', () => ({
  createConnector: jest.fn(),
  deleteConnectorById: jest.fn(),
  fetchConnectorByIndexName: jest.fn(),
}));
jest.mock('../crawler/fetch_crawlers', () => ({ fetchCrawlerByIndexName: jest.fn() }));

describe('addConnector lib function', () => {
  const mockClient = {
    asCurrentUser: {
      index: jest.fn(),
      indices: {
        create: jest.fn(),
        exists: jest.fn(),
        getMapping: jest.fn(),
      },
    },
    asInternalUser: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const connectorsIndicesMapping = {
    '.elastic-connectors-v1': {
      mappings: {
        _meta: {
          pipeline: {
            default_extract_binary_content: true,
            default_name: 'ent-search-generic-ingestion',
            default_reduce_whitespace: true,
            default_run_ml_inference: true,
          },
          version: '1',
        },
      },
    },
  };

  it('should add connector', async () => {
    mockClient.asCurrentUser.index.mockImplementation(() => ({ _id: 'fakeId' }));
    (createConnector as jest.Mock).mockImplementation(() => ({
      id: 'fakeId',
      index_name: 'index_name',
    }));
    mockClient.asCurrentUser.indices.exists.mockImplementation(() => false);
    (fetchConnectorByIndexName as jest.Mock).mockImplementation(() => undefined);
    (fetchCrawlerByIndexName as jest.Mock).mockImplementation(() => undefined);
    mockClient.asCurrentUser.indices.getMapping.mockImplementation(() => connectorsIndicesMapping);

    await expect(
      addConnector(mockClient as unknown as IScopedClusterClient, {
        indexName: 'index_name',
        isNative: false,
        language: 'fr',
      })
    ).resolves.toEqual(expect.objectContaining({ id: 'fakeId', index_name: 'index_name' }));
    expect(createConnector).toHaveBeenCalledWith(mockClient.asCurrentUser, {
      indexName: 'index_name',
      isNative: false,
      language: 'fr',
      name: 'index_name',
      pipeline: {
        extract_binary_content: true,
        name: 'ent-search-generic-ingestion',
        reduce_whitespace: true,
        run_ml_inference: true,
      },
    });
    expect(mockClient.asCurrentUser.indices.create).toHaveBeenCalledWith({
      index: 'index_name',
      mappings: {},
      settings: { ...textAnalysisSettings('fr'), auto_expand_replicas: '0-3', number_of_shards: 2 },
    });
  });

  it('should reject if index already exists', async () => {
    mockClient.asCurrentUser.index.mockImplementation(() => ({ _id: 'fakeId' }));
    (createConnector as jest.Mock).mockImplementation(() => ({
      id: 'fakeId',
      index_name: 'index_name',
    }));
    mockClient.asCurrentUser.indices.exists.mockImplementation(() => true);
    (fetchConnectorByIndexName as jest.Mock).mockImplementation(() => undefined);
    (fetchCrawlerByIndexName as jest.Mock).mockImplementation(() => undefined);
    mockClient.asCurrentUser.indices.getMapping.mockImplementation(() => connectorsIndicesMapping);

    await expect(
      addConnector(mockClient as unknown as IScopedClusterClient, {
        indexName: 'index_name',
        isNative: true,
        language: 'en',
      })
    ).rejects.toEqual(new Error(ErrorCode.INDEX_ALREADY_EXISTS));
    expect(mockClient.asCurrentUser.indices.create).not.toHaveBeenCalled();
  });

  it('should reject if connector already exists', async () => {
    mockClient.asCurrentUser.index.mockImplementation(() => ({ _id: 'fakeId' }));
    mockClient.asCurrentUser.indices.exists.mockImplementation(() => false);
    (fetchConnectorByIndexName as jest.Mock).mockImplementation(() => true);
    (fetchCrawlerByIndexName as jest.Mock).mockImplementation(() => undefined);
    mockClient.asCurrentUser.indices.getMapping.mockImplementation(() => connectorsIndicesMapping);

    await expect(
      addConnector(mockClient as unknown as IScopedClusterClient, {
        indexName: 'index_name',
        isNative: false,
        language: 'en',
      })
    ).rejects.toEqual(new Error(ErrorCode.CONNECTOR_DOCUMENT_ALREADY_EXISTS));
    expect(mockClient.asCurrentUser.indices.create).not.toHaveBeenCalled();
  });

  it('should reject if crawler already exists', async () => {
    mockClient.asCurrentUser.index.mockImplementation(() => ({ _id: 'fakeId' }));
    (createConnector as jest.Mock).mockImplementation(() => ({
      id: 'fakeId',
      index_name: 'index_name',
    }));
    mockClient.asCurrentUser.indices.exists.mockImplementation(() => false);
    (fetchConnectorByIndexName as jest.Mock).mockImplementation(() => undefined);
    (fetchCrawlerByIndexName as jest.Mock).mockImplementation(() => true);
    mockClient.asCurrentUser.indices.getMapping.mockImplementation(() => connectorsIndicesMapping);

    await expect(
      addConnector(mockClient as unknown as IScopedClusterClient, {
        indexName: 'index_name',
        isNative: false,
        language: 'en',
      })
    ).rejects.toEqual(new Error(ErrorCode.CRAWLER_ALREADY_EXISTS));
    expect(mockClient.asCurrentUser.indices.create).not.toHaveBeenCalled();
    expect(createConnector).not.toHaveBeenCalled();
  });

  it('should reject with index already exists if connector and index already exist', async () => {
    mockClient.asCurrentUser.index.mockImplementation(() => ({ _id: 'fakeId' }));
    mockClient.asCurrentUser.indices.exists.mockImplementation(() => true);
    (fetchConnectorByIndexName as jest.Mock).mockImplementation(() => true);
    (fetchCrawlerByIndexName as jest.Mock).mockImplementation(() => undefined);
    mockClient.asCurrentUser.indices.getMapping.mockImplementation(() => connectorsIndicesMapping);

    await expect(
      addConnector(mockClient as unknown as IScopedClusterClient, {
        indexName: 'index_name',
        isNative: true,
        language: 'en',
      })
    ).rejects.toEqual(new Error(ErrorCode.INDEX_ALREADY_EXISTS));
    expect(mockClient.asCurrentUser.indices.create).not.toHaveBeenCalled();
    expect(createConnector).not.toHaveBeenCalled();
  });

  it('should replace connector if deleteExistingConnector flag is true', async () => {
    mockClient.asCurrentUser.index.mockImplementation(() => ({ _id: 'fakeId' }));
    (createConnector as jest.Mock).mockImplementation(() => ({
      id: 'fakeId',
      index_name: 'index_name',
    }));
    mockClient.asCurrentUser.indices.exists.mockImplementation(() => false);
    (fetchConnectorByIndexName as jest.Mock).mockImplementation(() => ({ id: 'connectorId' }));
    (fetchCrawlerByIndexName as jest.Mock).mockImplementation(() => undefined);
    mockClient.asCurrentUser.indices.getMapping.mockImplementation(() => connectorsIndicesMapping);

    await expect(
      addConnector(mockClient as unknown as IScopedClusterClient, {
        deleteExistingConnector: true,
        indexName: 'index_name',
        isNative: true,
        language: null,
      })
    ).resolves.toEqual(expect.objectContaining({ id: 'fakeId', index_name: 'index_name' }));
    expect(deleteConnectorById).toHaveBeenCalledWith(mockClient.asCurrentUser, 'connectorId');
    expect(createConnector).toHaveBeenCalledWith(mockClient.asCurrentUser, {
      deleteExistingConnector: true,
      indexName: 'index_name',
      isNative: true,
      language: null,
      name: 'index_name',
      pipeline: {
        extract_binary_content: true,
        name: 'ent-search-generic-ingestion',
        reduce_whitespace: true,
        run_ml_inference: true,
      },
    });
    expect(mockClient.asCurrentUser.indices.create).toHaveBeenCalledWith({
      index: 'index_name',
      mappings: {},
      settings: {
        ...textAnalysisSettings(undefined),
        auto_expand_replicas: '0-3',
        number_of_shards: 2,
      },
    });
  });
});
