/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { deleteMigrationSavedObject } from './delete_migration_saved_object';
import { isMigrationFailed, isMigrationPending, isMigrationSuccess } from './helpers';
import { applyMigrationCleanupPolicy } from './migration_cleanup';
import { SignalsMigrationSO } from './saved_objects_schema';

/**
 * Deletes a completed migration:
 *   * deletes the migration SO
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
  if (isMigrationPending(migration)) {
    return migration;
  }

  const { destinationIndex, sourceIndex, taskId } = migration.attributes;

  if (isMigrationFailed(migration)) {
    await applyMigrationCleanupPolicy({
      alias: signalsAlias,
      esClient,
      index: destinationIndex,
    });
  }
  if (isMigrationSuccess(migration)) {
    await applyMigrationCleanupPolicy({
      alias: signalsAlias,
      esClient,
      index: sourceIndex,
    });
  }

  await esClient.delete({ index: '.tasks', id: taskId });
  await deleteMigrationSavedObject({ id: migration.id, soClient });

  return migration;
};
