/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { getIndexCount } from '@kbn/securitysolution-es-utils';
import { isMigrationPending } from './helpers';
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
 * @param username name of the user initiating the finalization
 *
 * @returns the migration SavedObject {@link SignalsMigrationSO}
 * @throws if the migration is invalid or a client throws
 */
export const finalizeMigration = async ({
  esClient,
  migration,
  signalsAlias,
  soClient,
  username,
}: {
  esClient: ElasticsearchClient;
  migration: SignalsMigrationSO;
  signalsAlias: string;
  soClient: SavedObjectsClientContract;
  username: string;
}): Promise<SignalsMigrationSO> => {
  if (!isMigrationPending(migration)) {
    return migration;
  }

  const { destinationIndex, sourceIndex, taskId } = migration.attributes;

  const task = await esClient.tasks.get({ task_id: taskId });
  if (!task.completed) {
    return migration;
  }

  const sourceCount = await getIndexCount({ esClient, index: sourceIndex });
  const destinationCount = await getIndexCount({ esClient, index: destinationIndex });
  if (sourceCount !== destinationCount) {
    const updatedMigration = await updateMigrationSavedObject({
      username,
      soClient,
      id: migration.id,
      attributes: {
        status: 'failure',
        error: `The source and destination indexes have different document counts. Source [${sourceIndex}] has [${sourceCount}] documents, while destination [${destinationIndex}] has [${destinationCount}] documents.`,
      },
    });

    await applyMigrationCleanupPolicy({
      alias: signalsAlias,
      esClient,
      index: destinationIndex,
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

  const updatedMigration = await updateMigrationSavedObject({
    username,
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
