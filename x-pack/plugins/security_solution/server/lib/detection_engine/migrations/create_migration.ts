/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'src/core/server';
import { SignalsReindexOptions } from '../../../../common/detection_engine/schemas/request/create_signals_migration_schema';
import { createMigrationIndex } from './create_migration_index';

export interface CreatedMigration {
  destinationIndex: string;
  sourceIndex: string;
  taskId: string;
  version: number;
}

/**
 * Migrates signals for a given concrete index. Signals are reindexed into a
 * new index in order to receive new fields. Migrated signals have a
 * `signal._meta.version` field representing the mappings version at the time of the migration.
 *
 * @param esClient An {@link ElasticsearchClient}
 * @param index name of the concrete signals index to be migrated
 * @param version version of the current signals template/mappings
 * @param reindexOptions object containing reindex options {@link SignalsReindexOptions}
 *
 * @returns identifying information representing the {@link MigrationInfo}
 * @throws if elasticsearch returns an error
 */
export const createMigration = async ({
  esClient,
  index,
  reindexOptions,
  version,
}: {
  esClient: ElasticsearchClient;
  index: string;
  reindexOptions: SignalsReindexOptions;
  version: number;
}): Promise<CreatedMigration> => {
  const migrationIndex = await createMigrationIndex({
    esClient,
    index,
    version,
  });

  const { size, ...reindexQueryOptions } = reindexOptions;

  const response = await esClient.reindex<{ task: string }>({
    body: {
      dest: { index: migrationIndex },
      source: { index, size },
      script: {
        lang: 'painless',
        source: `
                if (ctx._source.signal._meta == null) {
                  ctx._source.signal._meta = [:];
                }
                ctx._source.signal._meta.version = params.version;
              `,
        params: {
          version,
        },
      },
    },
    ...reindexQueryOptions,
    refresh: true,
    wait_for_completion: false,
  });

  return {
    destinationIndex: migrationIndex,
    sourceIndex: index,
    taskId: response.body.task,
    version,
  };
};
