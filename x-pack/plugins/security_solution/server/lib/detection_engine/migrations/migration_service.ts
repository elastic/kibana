/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ElasticsearchClient,
  SavedObjectsClientContract,
  SavedObjectsUpdateResponse,
  SavedObjectsFindOptions,
} from 'src/core/server';
import { SignalsReindexOptions } from '../../../../common/detection_engine/schemas/request/create_signals_migration_schema';
import {
  SignalsMigrationSO,
  SignalsMigrationSOAttributes,
  SignalsMigrationSOUpdateAttributes,
} from './saved_objects_schema';
import { findMigrationSavedObjects } from './find_migration_saved_objects';
import { createMigrationSavedObject } from './create_migration_saved_object';
import { updateMigrationSavedObject } from './update_migration_saved_object';
import { deleteMigrationSavedObject } from './delete_migration_saved_object';
import { createMigration } from './create_migration';

export interface CreateParams {
  index: string;
  version: number;
  reindexOptions: SignalsReindexOptions;
}

export interface SignalsMigrationService {
  find: (options?: Omit<SavedObjectsFindOptions, 'type'>) => Promise<SignalsMigrationSO[]>;
  create: (params: CreateParams) => Promise<SignalsMigrationSO>;
  update: (
    id: string,
    attributes: SignalsMigrationSOUpdateAttributes
  ) => Promise<SavedObjectsUpdateResponse<SignalsMigrationSOAttributes>>;
  delete: (id: string) => Promise<void>;
}

export const signalsMigrationService = ({
  esClient,
  soClient,
  username = 'system',
}: {
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  username: string;
}): SignalsMigrationService => {
  return {
    find: (options) => findMigrationSavedObjects({ options, soClient }),
    create: async ({ index, reindexOptions, version }) => {
      const migrationInfo = await createMigration({
        esClient,
        index,
        version,
        reindexOptions,
      });

      return createMigrationSavedObject({
        attributes: { ...migrationInfo, status: 'pending' },
        soClient,
        username,
      });
    },
    update: (id, attributes) => updateMigrationSavedObject({ attributes, id, username, soClient }),
    delete: (id) => deleteMigrationSavedObject({ id, soClient }),
  };
};
