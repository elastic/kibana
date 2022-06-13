/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { deleteMigration } from './delete_migration';
import { getSignalsMigrationSavedObjectMock } from './saved_objects_schema.mock';
import { deleteMigrationSavedObject } from './delete_migration_saved_object';
import { applyMigrationCleanupPolicy } from './migration_cleanup';

jest.mock('./migration_cleanup');
jest.mock('./delete_migration_saved_object');

describe('deleteMigration', () => {
  let esClient: ElasticsearchClient;
  let soClient: SavedObjectsClientContract;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    soClient = savedObjectsClientMock.create();
  });

  it('does not delete a pending migration', async () => {
    const pendingMigration = getSignalsMigrationSavedObjectMock();
    await deleteMigration({
      esClient,
      migration: pendingMigration,
      signalsAlias: 'my-signals-alias',
      soClient,
    });

    expect(deleteMigrationSavedObject).not.toHaveBeenCalled();
  });

  it('deletes a failed migration', async () => {
    const failedMigration = getSignalsMigrationSavedObjectMock({ status: 'failure' });
    const deletedMigration = await deleteMigration({
      esClient,
      migration: failedMigration,
      signalsAlias: 'my-signals-alias',
      soClient,
    });

    expect(deletedMigration.id).toEqual(failedMigration.id);
    expect(deleteMigrationSavedObject).toHaveBeenCalledWith(
      expect.objectContaining({
        id: failedMigration.id,
      })
    );
    expect(applyMigrationCleanupPolicy).toHaveBeenCalledWith(
      expect.objectContaining({
        index: failedMigration.attributes.destinationIndex,
      })
    );
  });

  it('deletes a successful migration', async () => {
    const successMigration = getSignalsMigrationSavedObjectMock({ status: 'success' });
    const deletedMigration = await deleteMigration({
      esClient,
      migration: successMigration,
      signalsAlias: 'my-signals-alias',
      soClient,
    });

    expect(deletedMigration.id).toEqual(successMigration.id);
    expect(deleteMigrationSavedObject).toHaveBeenCalledWith(
      expect.objectContaining({
        id: successMigration.id,
      })
    );
    expect(applyMigrationCleanupPolicy).toHaveBeenCalledWith(
      expect.objectContaining({
        index: successMigration.attributes.sourceIndex,
      })
    );
  });
});
