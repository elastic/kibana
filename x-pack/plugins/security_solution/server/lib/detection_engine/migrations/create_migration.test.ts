/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { createMigrationIndex } from './create_migration_index';
import { createMigration } from './create_migration';

jest.mock('./create_migration_index');

describe('createMigration', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('passes reindex options to the reindex call', async () => {
    const reindexOptions = {
      requests_per_second: 3,
      size: 10,
      slices: 2,
    };
    await createMigration({
      esClient,
      index: 'my-signals-index',
      reindexOptions,
      version: 12,
    });

    expect(esClient.reindex).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          source: {
            index: 'my-signals-index',
            size: reindexOptions.size,
          },
        }),
        requests_per_second: reindexOptions.requests_per_second,
        slices: reindexOptions.slices,
      })
    );
  });

  it('returns info about the created migration', async () => {
    (createMigrationIndex as jest.Mock).mockResolvedValueOnce('destinationIndex');
    esClient.reindex.mockResponseOnce({ task: 'reindexTaskId' });

    const migration = await createMigration({
      esClient,
      index: 'my-signals-index',
      reindexOptions: {},
      version: 12,
    });

    expect(migration).toEqual({
      destinationIndex: 'destinationIndex',
      sourceIndex: 'my-signals-index',
      taskId: 'reindexTaskId',
      version: 12,
    });
  });
});
