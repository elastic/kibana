/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { SignalsReindexOptions } from '../../../../common/detection_engine/schemas/request/create_signals_migration_schema';
import { SignalsMigrationSO } from './saved_objects_schema';
import { createMigrationSavedObject } from './create_migration_saved_object';
import { createMigration } from './create_migration';
import { finalizeMigration } from './finalize_migration';
import { deleteMigration } from './delete_migration';

export interface CreateParams {
  index: string;
  version: number;
  reindexOptions: SignalsReindexOptions;
}

export interface FinalizeParams {
  signalsAlias: string;
  migration: SignalsMigrationSO;
}

export interface DeleteParams {
  signalsAlias: string;
  migration: SignalsMigrationSO;
}

export interface SignalsMigrationService {
  create: (params: CreateParams) => Promise<SignalsMigrationSO>;
  finalize: (params: FinalizeParams) => Promise<SignalsMigrationSO>;
  delete: (params: DeleteParams) => Promise<SignalsMigrationSO>;
}

export const signalsMigrationService = ({
  esClient,
  soClient,
  username,
}: {
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  username: string;
}): SignalsMigrationService => {
  return {
    create: async ({ index, reindexOptions, version }) => {
      const migrationInfo = await createMigration({
        esClient,
        index,
        version,
        reindexOptions,
      });

      return createMigrationSavedObject({
        attributes: { ...migrationInfo, status: 'pending', error: null },
        soClient,
        username,
      });
    },
    finalize: ({ migration, signalsAlias }) =>
      finalizeMigration({
        esClient,
        migration,
        signalsAlias,
        soClient,
        username,
      }),
    delete: ({ migration, signalsAlias }) =>
      deleteMigration({
        esClient,
        migration,
        signalsAlias,
        soClient,
      }),
  };
};
