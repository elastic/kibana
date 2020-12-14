/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchClient } from 'src/core/server';
import { elasticsearchServiceMock } from 'src/core/server/mocks';
import {
  getIndexMappingsResponseMock,
  getMigrationStatusSearchResponseMock,
} from './get_migration_status.mock';
import { getMigrationStatus } from './get_migration_status';

describe('getMigrationStatus', () => {
  let esClient: ElasticsearchClient;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();

    // mock index version
    (esClient.indices.getMapping as jest.Mock).mockResolvedValue({
      body: {
        ...getIndexMappingsResponseMock('index1'),
      },
    });

    // mock index search
    (esClient.search as jest.Mock).mockResolvedValue({
      body: {
        ...getMigrationStatusSearchResponseMock(['index1']),
      },
    });
  });

  it('returns one entry for each index provided', async () => {
    (esClient.indices.getMapping as jest.Mock).mockResolvedValueOnce({
      body: {
        ...getIndexMappingsResponseMock('index1'),
        ...getIndexMappingsResponseMock('index2'),
        ...getIndexMappingsResponseMock('index3'),
      },
    });

    // mock index search
    (esClient.search as jest.Mock).mockResolvedValueOnce({
      body: getMigrationStatusSearchResponseMock(['index1', 'index2', 'index3']),
    });

    const migrationStatuses = await getMigrationStatus({
      esClient,
      index: ['index1', 'index2', 'index3'],
    });

    expect(migrationStatuses).toHaveLength(3);
  });

  it('returns the name and version for each index provided', async () => {
    const [migrationStatus] = await getMigrationStatus({
      esClient,
      index: ['index1'],
    });

    expect(migrationStatus).toEqual(
      expect.objectContaining({
        name: 'index1',
        version: -1,
      })
    );
  });

  it('returns the breakdown of signals versions available in each index', async () => {
    const [migrationStatus] = await getMigrationStatus({
      esClient,
      index: ['index1'],
    });

    expect(migrationStatus).toEqual(
      expect.objectContaining({
        signal_versions: [{ key: -1, doc_count: 4 }],
      })
    );
  });

  it('defaults the index version to 0 if missing from the mapping', async () => {
    (esClient.indices.getMapping as jest.Mock).mockResolvedValueOnce({
      body: {
        index1: { mappings: {} },
      },
    });

    const [migrationStatus] = await getMigrationStatus({
      esClient,
      index: ['index1'],
    });

    expect(migrationStatus).toEqual(
      expect.objectContaining({
        version: 0,
      })
    );
  });
});
