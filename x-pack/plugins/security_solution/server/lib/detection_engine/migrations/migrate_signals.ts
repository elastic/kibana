/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchClient } from 'src/core/server';
import { createSignalsMigrationIndex } from './create_signals_migration_index';
import { MigrationDetails } from './types';

/**
 * Migrates signals for a given concrete index. Signals are reindexed into a
 * new index in order to receive new fields. Migrated signals have a
 * `signal._meta.schema_version` field representing the mappings version at the time of the migration.
 *
 * @param esClient An {@link ElasticsearchClient}
 * @param index name of the concrete signals index to be migrated
 * @param version version of the current signals template/mappings
 *
 * @returns identifying information representing the {@link MigrationDetails}
 * @throws if elasticsearch returns an error
 */
export const migrateSignals = async ({
  esClient,
  index,
  version,
}: {
  esClient: ElasticsearchClient;
  index: string;
  version: number;
}): Promise<MigrationDetails> => {
  const migrationIndex = await createSignalsMigrationIndex({
    esClient,
    index,
    version,
  });

  // TODO batch size?
  const response = await esClient.reindex<{ task: string }>({
    body: {
      dest: { index: migrationIndex },
      source: { index },
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
    refresh: true,
    wait_for_completion: false,
  });

  return {
    destinationIndex: migrationIndex,
    sourceIndex: index,
    taskId: response.body.task,
  };
};
