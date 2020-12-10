/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchClient } from 'src/core/server';
import { elasticsearchServiceMock } from 'src/core/server/mocks';
import { createMigrationIndex } from './create_migration_index';

describe('createMigrationIndex', () => {
  let esClient: ElasticsearchClient;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('creates an index suffixed with the template version', async () => {
    await createMigrationIndex({ esClient, index: 'my-signals-index', version: 4 });

    expect(esClient.indices.create).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'my-signals-index-r000004' })
    );
  });
});
