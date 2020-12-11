/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchClient, SavedObjectsClientContract } from 'src/core/server';
import { elasticsearchServiceMock, savedObjectsClientMock } from 'src/core/server/mocks';
import { deleteMigration } from './delete_migration';
import { getSignalsMigrationSavedObjectMock } from './saved_objects_schema.mock';

describe('deleteMigration', () => {
  let esClient: ElasticsearchClient;
  let soClient: SavedObjectsClientContract;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    soClient = savedObjectsClientMock.create();
  });

  it('does not delete an already-deleted migration', async () => {
    const deletedMigration = getSignalsMigrationSavedObjectMock({ deleted: true });
    await deleteMigration({
      esClient,
      migration: deletedMigration,
      signalsAlias: 'my-signals-alias',
      soClient,
    });

    expect(soClient.update).not.toHaveBeenCalled();
  });
});
