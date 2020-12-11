/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchClient, SavedObjectsClientContract } from 'src/core/server';
import { getIndexCount } from '../index/get_index_count';
import { isMigrationFailed, isMigrationSuccess } from './helpers';
import { applyMigrationCleanupPolicy } from './migration_cleanup';
import { replaceSignalsIndexAlias } from './replace_signals_index_alias';
import { SignalsMigrationSO } from './saved_objects_schema';
import { updateMigrationSavedObject } from './update_migration_saved_object';

/**
 * Finalizes a given migration:
 *   * validates that the migration has completed successfully
 *   * deletes the reindex task document
 *   * applies the deletion policy to the old index
 *   * swaps aliases on the old/new index
 *
 * @param esClient An {@link ElasticsearchClient}
 * @param soClient An {@link SavedObjectsClientContract}
 * @param migration the migration to be finalized {@link SignalsMigrationSO}
 * @param signalsAlias the alias for signals indices
 *
 * @returns the migration SavedObject {@link SignalsMigrationSO}
 * @throws if the migration is invalid or a client throws
 */
export const finalizeMigration = async ({
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
  if (isMigrationFailed(migration) || isMigrationSuccess(migration)) {
    return migration;
  }

  const { destinationIndex, sourceIndex, taskId } = migration.attributes;

  const { body: task } = await esClient.tasks.get<{ completed: boolean }>({ task_id: taskId });
  if (!task.completed) {
    return migration;
  }

  const sourceCount = await getIndexCount({ esClient, index: sourceIndex });
  const destinationCount = await getIndexCount({ esClient, index: destinationIndex });
  if (sourceCount !== destinationCount) {
    const updatedMigration = await updateMigrationSavedObject({
      username: 'TODO',
      soClient,
      id: migration.id,
      attributes: {
        status: 'failure',
        error: `The source and destination indexes have different document counts. Source [${sourceIndex}] has [${sourceCount}] documents, while destination [${destinationIndex}] has [${destinationCount}] documents.`,
      },
    });

    return {
      ...migration,
      attributes: {
        ...migration.attributes,
        ...updatedMigration.attributes,
      },
    };
  }

  await replaceSignalsIndexAlias({
    alias: signalsAlias,
    esClient,
    newIndex: destinationIndex,
    oldIndex: sourceIndex,
  });
  await applyMigrationCleanupPolicy({
    alias: signalsAlias,
    esClient,
    index: sourceIndex,
  });
  await esClient.delete({ index: '.tasks', id: taskId });

  const updatedMigration = await updateMigrationSavedObject({
    username: 'TODO',
    soClient,
    id: migration.id,
    attributes: {
      status: 'success',
    },
  });

  return {
    ...migration,
    attributes: {
      ...migration.attributes,
      ...updatedMigration.attributes,
    },
  };
};
