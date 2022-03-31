/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from 'src/core/server/mocks';
import { getIndexCount } from '@kbn/securitysolution-es-utils';
import { updateMigrationSavedObject } from './update_migration_saved_object';
import { getSignalsMigrationSavedObjectMock } from './saved_objects_schema.mock';
import { finalizeMigration } from './finalize_migration';

jest.mock('./update_migration_saved_object');
jest.mock('@kbn/securitysolution-es-utils');

describe('finalizeMigration', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let soClient: ReturnType<typeof savedObjectsClientMock.create>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    soClient = savedObjectsClientMock.create();

    // @ts-expect-error stubbing what we use of the task response
    // all our reindex tasks are completed
    esClient.tasks.get.mockResponse({ completed: true });

    // stub out our update call to just return the attributes we passed
    (updateMigrationSavedObject as jest.Mock).mockImplementation(({ attributes }) => ({
      attributes,
    }));
  });

  it('does not finalize a failed migration', async () => {
    const failedMigration = getSignalsMigrationSavedObjectMock({ status: 'failure' });
    const finalizedMigration = await finalizeMigration({
      esClient,
      migration: failedMigration,
      signalsAlias: 'my-signals-alias',
      soClient,
      username: 'username',
    });

    expect(updateMigrationSavedObject).not.toHaveBeenCalled();
    expect(finalizedMigration).toEqual(failedMigration);
  });

  it('does not finalize a successful (aka finalized) migration', async () => {
    const alreadyFinalizedMigration = getSignalsMigrationSavedObjectMock({ status: 'success' });
    const finalizedMigration = await finalizeMigration({
      esClient,
      migration: alreadyFinalizedMigration,
      signalsAlias: 'my-signals-alias',
      soClient,
      username: 'username',
    });

    expect(updateMigrationSavedObject).not.toHaveBeenCalled();
    expect(finalizedMigration).toEqual(alreadyFinalizedMigration);
  });

  it('fails the migration if migration index size does not match the original index', async () => {
    (getIndexCount as jest.Mock).mockResolvedValueOnce(1).mockResolvedValueOnce(2);

    const expectedError =
      'The source and destination indexes have different document counts. Source [sourceIndex] has [1] documents, while destination [destinationIndex] has [2] documents.';
    const migration = getSignalsMigrationSavedObjectMock();
    const finalizedMigration = await finalizeMigration({
      esClient,
      migration,
      signalsAlias: 'my-signals-alias',
      soClient,
      username: 'username',
    });

    expect(updateMigrationSavedObject).toHaveBeenCalledWith(
      expect.objectContaining({
        attributes: {
          status: 'failure',
          error: expectedError,
        },
      })
    );
    expect(finalizedMigration.id).toEqual(migration.id);
    expect(finalizedMigration.attributes.status).toEqual('failure');
    expect(finalizedMigration.attributes.error).toEqual(expectedError);
  });
});
