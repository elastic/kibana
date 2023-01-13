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

import { fetchCrawlerByIndexName } from '../crawler/fetch_crawlers';
import { textAnalysisSettings } from '../indices/text_analysis';

import { addConnector } from './add_connector';
import { fetchConnectorByIndexName } from './fetch_connectors';

jest.mock('../../index_management/setup_indices', () => ({
  setupConnectorsIndices: jest.fn(),
}));

jest.mock('./fetch_connectors', () => ({ fetchConnectorByIndexName: jest.fn() }));
jest.mock('../crawler/fetch_crawlers', () => ({ fetchCrawlerByIndexName: jest.fn() }));

describe('addConnector lib function', () => {
  const mockClient = {
    asCurrentUser: {
      delete: jest.fn(),
      index: jest.fn(),
      indices: {
        create: jest.fn(),
        exists: jest.fn(),
        getMapping: jest.fn(),
      },
    },
    asInternalUser: {},
  };

  const createConnectorsIndexExistsFn =
    (connectorsIndexExists: boolean, defaultValue: boolean) =>
    ({ index }: { index: string }) =>
      index === CONNECTORS_INDEX ? connectorsIndexExists : defaultValue;

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
            default_run_ml_inference: false,
          },
          version: '1',
        },
      },
    },
  };

  it('should add connector', async () => {
    mockClient.asCurrentUser.index.mockImplementation(() => ({ _id: 'fakeId' }));
    mockClient.asCurrentUser.indices.exists.mockImplementation(
      createConnectorsIndexExistsFn(true, false)
    );
    (fetchConnectorByIndexName as jest.Mock).mockImplementation(() => undefined);
    (fetchCrawlerByIndexName as jest.Mock).mockImplementation(() => undefined);
    mockClient.asCurrentUser.indices.getMapping.mockImplementation(() => connectorsIndicesMapping);

    await expect(
      addConnector(mockClient as unknown as IScopedClusterClient, {
        index_name: 'index_name',
        is_native: false,
        language: 'fr',
      })
    ).resolves.toEqual({ id: 'fakeId', index_name: 'index_name' });
    expect(mockClient.asCurrentUser.index).toHaveBeenCalledWith({
      document: {
        api_key_id: null,
        configuration: {},
        description: null,
        error: null,
        features: null,
        filtering: [
          {
            active: {
              advanced_snippet: {
                created_at: expect.any(String),
                updated_at: expect.any(String),
                value: {},
              },
              rules: [
                {
                  created_at: expect.any(String),
                  field: '_',
                  id: 'DEFAULT',
                  order: 0,
                  policy: 'include',
                  rule: 'regex',
                  updated_at: expect.any(String),
                  value: '.*',
                },
              ],
              validation: {
                errors: [],
                state: 'valid',
              },
            },
            domain: 'DEFAULT',
            draft: {
              advanced_snippet: {
                created_at: expect.any(String),
                updated_at: expect.any(String),
                value: {},
              },
              rules: [
                {
                  created_at: expect.any(String),
                  field: '_',
                  id: 'DEFAULT',
                  order: 0,
                  policy: 'include',
                  rule: 'regex',
                  updated_at: expect.any(String),
                  value: '.*',
                },
              ],
              validation: {
                errors: [],
                state: 'valid',
              },
            },
          },
        ],
        index_name: 'index_name',
        is_native: false,
        language: 'fr',
        last_seen: null,
        last_sync_error: null,
        last_sync_status: null,
        last_synced: null,
        name: 'index_name',
        pipeline: {
          extract_binary_content: true,
          name: 'ent-search-generic-ingestion',
          reduce_whitespace: true,
          run_ml_inference: false,
        },
        scheduling: { enabled: false, interval: '0 0 0 * * ?' },
        service_type: null,
        status: ConnectorStatus.CREATED,
        sync_now: false,
      },
      index: CONNECTORS_INDEX,
      refresh: true,
    });
    expect(mockClient.asCurrentUser.indices.create).toHaveBeenCalledWith({
      index: 'index_name',
      mappings: {},
      settings: { ...textAnalysisSettings('fr'), auto_expand_replicas: '0-3', number_of_shards: 2 },
    });
  });

  it('should reject if index already exists', async () => {
    mockClient.asCurrentUser.index.mockImplementation(() => ({ _id: 'fakeId' }));
    mockClient.asCurrentUser.indices.exists.mockImplementation(
      createConnectorsIndexExistsFn(true, true)
    );
    (fetchConnectorByIndexName as jest.Mock).mockImplementation(() => undefined);
    (fetchCrawlerByIndexName as jest.Mock).mockImplementation(() => undefined);
    mockClient.asCurrentUser.indices.getMapping.mockImplementation(() => connectorsIndicesMapping);

    await expect(
      addConnector(mockClient as unknown as IScopedClusterClient, {
        index_name: 'index_name',
        is_native: true,
        language: 'en',
      })
    ).rejects.toEqual(new Error(ErrorCode.INDEX_ALREADY_EXISTS));
    expect(mockClient.asCurrentUser.indices.create).not.toHaveBeenCalled();
  });

  it('should reject if connector already exists', async () => {
    mockClient.asCurrentUser.index.mockImplementation(() => ({ _id: 'fakeId' }));
    mockClient.asCurrentUser.indices.exists.mockImplementation(
      createConnectorsIndexExistsFn(true, false)
    );
    (fetchConnectorByIndexName as jest.Mock).mockImplementation(() => true);
    (fetchCrawlerByIndexName as jest.Mock).mockImplementation(() => undefined);
    mockClient.asCurrentUser.indices.getMapping.mockImplementation(() => connectorsIndicesMapping);

    await expect(
      addConnector(mockClient as unknown as IScopedClusterClient, {
        index_name: 'index_name',
        is_native: false,
        language: 'en',
      })
    ).rejects.toEqual(new Error(ErrorCode.CONNECTOR_DOCUMENT_ALREADY_EXISTS));
    expect(mockClient.asCurrentUser.indices.create).not.toHaveBeenCalled();
  });

  it('should reject if crawler already exists', async () => {
    mockClient.asCurrentUser.index.mockImplementation(() => ({ _id: 'fakeId' }));
    mockClient.asCurrentUser.indices.exists.mockImplementation(
      createConnectorsIndexExistsFn(true, false)
    );
    (fetchConnectorByIndexName as jest.Mock).mockImplementation(() => undefined);
    (fetchCrawlerByIndexName as jest.Mock).mockImplementation(() => true);
    mockClient.asCurrentUser.indices.getMapping.mockImplementation(() => connectorsIndicesMapping);

    await expect(
      addConnector(mockClient as unknown as IScopedClusterClient, {
        index_name: 'index_name',
        is_native: false,
        language: 'en',
      })
    ).rejects.toEqual(new Error(ErrorCode.CRAWLER_ALREADY_EXISTS));
    expect(mockClient.asCurrentUser.indices.create).not.toHaveBeenCalled();
  });

  it('should reject with index already exists if connector and index already exist', async () => {
    mockClient.asCurrentUser.index.mockImplementation(() => ({ _id: 'fakeId' }));
    mockClient.asCurrentUser.indices.exists.mockImplementation(
      createConnectorsIndexExistsFn(true, true)
    );
    (fetchConnectorByIndexName as jest.Mock).mockImplementation(() => true);
    (fetchCrawlerByIndexName as jest.Mock).mockImplementation(() => undefined);
    mockClient.asCurrentUser.indices.getMapping.mockImplementation(() => connectorsIndicesMapping);

    await expect(
      addConnector(mockClient as unknown as IScopedClusterClient, {
        index_name: 'index_name',
        is_native: true,
        language: 'en',
      })
    ).rejects.toEqual(new Error(ErrorCode.INDEX_ALREADY_EXISTS));
    expect(mockClient.asCurrentUser.indices.create).not.toHaveBeenCalled();
  });

  it('should replace connector if deleteExistingConnector flag is true', async () => {
    mockClient.asCurrentUser.index.mockImplementation(() => ({ _id: 'fakeId' }));
    mockClient.asCurrentUser.indices.exists.mockImplementation(
      createConnectorsIndexExistsFn(true, false)
    );
    (fetchConnectorByIndexName as jest.Mock).mockImplementation(() => ({ id: 'connectorId' }));
    (fetchCrawlerByIndexName as jest.Mock).mockImplementation(() => undefined);
    mockClient.asCurrentUser.indices.getMapping.mockImplementation(() => connectorsIndicesMapping);

    await expect(
      addConnector(mockClient as unknown as IScopedClusterClient, {
        delete_existing_connector: true,
        index_name: 'index_name',
        is_native: true,
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
        description: null,
        error: null,
        features: null,
        filtering: [
          {
            active: {
              advanced_snippet: {
                created_at: expect.any(String),
                updated_at: expect.any(String),
                value: {},
              },
              rules: [
                {
                  created_at: expect.any(String),
                  field: '_',
                  id: 'DEFAULT',
                  order: 0,
                  policy: 'include',
                  rule: 'regex',
                  updated_at: expect.any(String),
                  value: '.*',
                },
              ],
              validation: {
                errors: [],
                state: 'valid',
              },
            },
            domain: 'DEFAULT',
            draft: {
              advanced_snippet: {
                created_at: expect.any(String),
                updated_at: expect.any(String),
                value: {},
              },
              rules: [
                {
                  created_at: expect.any(String),
                  field: '_',
                  id: 'DEFAULT',
                  order: 0,
                  policy: 'include',
                  rule: 'regex',
                  updated_at: expect.any(String),
                  value: '.*',
                },
              ],
              validation: {
                errors: [],
                state: 'valid',
              },
            },
          },
        ],
        index_name: 'index_name',
        is_native: true,
        language: null,
        last_seen: null,
        last_sync_error: null,
        last_sync_status: null,
        last_synced: null,
        name: 'index_name',
        pipeline: {
          extract_binary_content: true,
          name: 'ent-search-generic-ingestion',
          reduce_whitespace: true,
          run_ml_inference: false,
        },
        scheduling: { enabled: false, interval: '0 0 0 * * ?' },
        service_type: null,
        status: ConnectorStatus.CREATED,
        sync_now: false,
      },
      index: CONNECTORS_INDEX,
      refresh: true,
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

  it('should create index if no connectors index exists', async () => {
    mockClient.asCurrentUser.indices.exists.mockImplementation(
      createConnectorsIndexExistsFn(false, false)
    );
    (fetchConnectorByIndexName as jest.Mock).mockImplementation(() => false);
    (fetchCrawlerByIndexName as jest.Mock).mockImplementation(() => undefined);
    mockClient.asCurrentUser.indices.getMapping.mockImplementation(() => connectorsIndicesMapping);
    await expect(
      addConnector(mockClient as unknown as IScopedClusterClient, {
        index_name: 'search-index_name',
        is_native: false,
        language: 'en',
      })
    ).resolves.toEqual({ id: 'fakeId', index_name: 'search-index_name' });
    expect(setupConnectorsIndices as jest.Mock).toHaveBeenCalledWith(mockClient.asCurrentUser);
    expect(mockClient.asCurrentUser.index).toHaveBeenCalledWith({
      document: {
        api_key_id: null,
        configuration: {},
        description: null,
        error: null,
        features: null,
        filtering: [
          {
            active: {
              advanced_snippet: {
                created_at: expect.any(String),
                updated_at: expect.any(String),
                value: {},
              },
              rules: [
                {
                  created_at: expect.any(String),
                  field: '_',
                  id: 'DEFAULT',
                  order: 0,
                  policy: 'include',
                  rule: 'regex',
                  updated_at: expect.any(String),
                  value: '.*',
                },
              ],
              validation: {
                errors: [],
                state: 'valid',
              },
            },
            domain: 'DEFAULT',
            draft: {
              advanced_snippet: {
                created_at: expect.any(String),
                updated_at: expect.any(String),
                value: {},
              },
              rules: [
                {
                  created_at: expect.any(String),
                  field: '_',
                  id: 'DEFAULT',
                  order: 0,
                  policy: 'include',
                  rule: 'regex',
                  updated_at: expect.any(String),
                  value: '.*',
                },
              ],
              validation: {
                errors: [],
                state: 'valid',
              },
            },
          },
        ],
        index_name: 'search-index_name',
        is_native: false,
        language: 'en',
        last_seen: null,
        last_sync_error: null,
        last_sync_status: null,
        last_synced: null,
        name: 'index_name',
        pipeline: {
          extract_binary_content: true,
          name: 'ent-search-generic-ingestion',
          reduce_whitespace: true,
          run_ml_inference: false,
        },
        scheduling: { enabled: false, interval: '0 0 0 * * ?' },
        service_type: null,
        status: ConnectorStatus.CREATED,
        sync_now: false,
      },
      index: CONNECTORS_INDEX,
      refresh: true,
    });
    expect(mockClient.asCurrentUser.indices.create).toHaveBeenCalledWith({
      index: 'search-index_name',
      mappings: {},
      settings: { ...textAnalysisSettings('en'), auto_expand_replicas: '0-3', number_of_shards: 2 },
    });
  });
});
