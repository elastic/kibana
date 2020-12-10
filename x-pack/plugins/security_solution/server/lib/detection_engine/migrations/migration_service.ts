/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObjectsClientContract,
  SavedObjectsUpdateResponse,
  SavedObjectsFindOptions,
} from 'src/core/server';
import {
  SignalsMigrationSO,
  SignalsMigrationSOAttributes,
  SignalsMigrationSOCreateAttributes,
  SignalsMigrationSOUpdateAttributes,
} from './saved_objects_schema';
import { findMigrationSavedObjects } from './find_migration_saved_objects';
import { createMigrationSavedObject } from './create_migration_saved_object';
import { updateMigrationSavedObject } from './update_migration_saved_object';
import { deleteMigrationSavedObject } from './delete_migration_saved_object';

export interface SignalsMigrationService {
  find: (options?: Omit<SavedObjectsFindOptions, 'type'>) => Promise<SignalsMigrationSO[]>;
  create: (attributes: SignalsMigrationSOCreateAttributes) => Promise<SignalsMigrationSO>;
  update: (
    id: string,
    attributes: SignalsMigrationSOUpdateAttributes
  ) => Promise<SavedObjectsUpdateResponse<SignalsMigrationSOAttributes>>;
  delete: (id: string) => Promise<void>;
}

export const signalsMigrationService = (
  savedObjectsClient: SavedObjectsClientContract,
  username = 'system'
): SignalsMigrationService => {
  return {
    find: (options) => findMigrationSavedObjects({ options, soClient: savedObjectsClient }),
    create: (attributes) =>
      createMigrationSavedObject({ attributes, soClient: savedObjectsClient, username }),
    update: (id, attributes) =>
      updateMigrationSavedObject({ attributes, id, username, soClient: savedObjectsClient }),
    delete: (id) => deleteMigrationSavedObject({ id, soClient: savedObjectsClient }),
  };
};
