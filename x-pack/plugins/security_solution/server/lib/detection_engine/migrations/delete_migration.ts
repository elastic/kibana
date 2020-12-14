/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchClient, SavedObjectsClientContract } from 'src/core/server';
import { isMigrationDeleted, isMigrationFailed, isMigrationPending } from './helpers';
import { applyMigrationCleanupPolicy } from './migration_cleanup';
import { SignalsMigrationSO } from './saved_objects_schema';
import { updateMigrationSavedObject } from './update_migration_saved_object';

/**
 * "Deletes" a completed migration:
 *   * soft-deletes the migration SO
 *   * deletes the underlying task document
 *   * applies deletion policy to the relevant index
 *
 * @param esClient An {@link ElasticsearchClient}
 * @param soClient An {@link SavedObjectsClientContract}
 * @param migration the migration to be finalized {@link SignalsMigrationSO}
 * @param signalsAlias the alias for signals indices
 *
 * @returns the migration SavedObject {@link SignalsMigrationSO}
 * @throws if the migration is invalid or a client throws
 */
export const deleteMigration = async ({
  esClient,
  migration,
  signalsAlias,
  soClient,
}: {
  esClient: ElasticsearchClient;
  migration: SignalsMigrationSO;
  signalsAlias: string;
  soClient: SavedObjectsClientContract;
}): Promise<SignalsMigrationSO> => {
  if (isMigrationPending(migration) || isMigrationDeleted(migration)) {
    return migration;
  }

  const { destinationIndex, taskId } = migration.attributes;

  if (isMigrationFailed(migration)) {
    await applyMigrationCleanupPolicy({
      alias: signalsAlias,
      esClient,
      index: destinationIndex,
    });
  }

  try {
    // task may have already have been deleted during finalization
    await esClient.delete({ index: '.tasks', id: taskId });
  } catch (error) {
    if (error.statusCode !== 404) {
      throw error;
    }
  }

  const deletedMigration = await updateMigrationSavedObject({
    username: 'TODO',
    soClient,
    id: migration.id,
    attributes: {
      deleted: true,
    },
  });

  return {
    ...migration,
    attributes: {
      ...migration.attributes,
      ...deletedMigration.attributes,
    },
  };
};
