/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchClient, SavedObjectsClientContract } from 'src/core/server';
import { elasticsearchServiceMock, savedObjectsClientMock } from 'src/core/server/mocks';
import { deleteMigration } from './delete_migration';
import { getSignalsMigrationSavedObjectMock } from './saved_objects_schema.mock';
import { updateMigrationSavedObject } from './update_migration_saved_object';

jest.mock('./update_migration_saved_object');

describe('deleteMigration', () => {
  let esClient: ElasticsearchClient;
  let soClient: SavedObjectsClientContract;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    soClient = savedObjectsClientMock.create();

    // stub out our update call to just return the attributes we passed
    (updateMigrationSavedObject as jest.Mock).mockImplementation(({ attributes }) => ({
      attributes,
    }));
  });

  it('does not delete an already-deleted migration', async () => {
    const deletedMigration = getSignalsMigrationSavedObjectMock({ deleted: true });
    await deleteMigration({
      esClient,
      migration: deletedMigration,
      signalsAlias: 'my-signals-alias',
      soClient,
    });

    expect(updateMigrationSavedObject).not.toHaveBeenCalled();
  });

  it('does not delete a pending migration', async () => {
    const pendingMigration = getSignalsMigrationSavedObjectMock();
    await deleteMigration({
      esClient,
      migration: pendingMigration,
      signalsAlias: 'my-signals-alias',
      soClient,
    });

    expect(updateMigrationSavedObject).not.toHaveBeenCalled();
  });

  it('deletes a failed migration', async () => {
    const failedMigration = getSignalsMigrationSavedObjectMock({ status: 'failure' });
    const deletedMigration = await deleteMigration({
      esClient,
      migration: failedMigration,
      signalsAlias: 'my-signals-alias',
      soClient,
    });

    expect(updateMigrationSavedObject).toHaveBeenCalledWith(
      expect.objectContaining({
        attributes: { deleted: true },
      })
    );
    expect(deletedMigration.id).toEqual(failedMigration.id);
    expect(deletedMigration.attributes.deleted).toEqual(true);
  });

  it('deletes a successful migration', async () => {
    const successMigration = getSignalsMigrationSavedObjectMock({ status: 'success' });
    const deletedMigration = await deleteMigration({
      esClient,
      migration: successMigration,
      signalsAlias: 'my-signals-alias',
      soClient,
    });

    expect(updateMigrationSavedObject).toHaveBeenCalledWith(
      expect.objectContaining({
        attributes: { deleted: true },
      })
    );

    expect(deletedMigration.id).toEqual(successMigration.id);
    expect(deletedMigration.attributes.deleted).toEqual(true);
  });
});
