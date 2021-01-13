/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import { findMigrationSavedObjects } from './find_migration_saved_objects';
import { signalsMigrationType } from './saved_objects';
import { SignalsMigrationSO } from './saved_objects_schema';

/**
 * Retrieves a list of migrations SOs by their ID
 *
 * @param soClient An {@link SavedObjectsClientContract}
 * @param ids IDs of the migration SOs
 *
 * @returns a list of {@link SignalsMigrationSO[]}
 *
 * @throws if client returns an error
 */
export const getMigrationSavedObjectsById = async ({
  ids,
  soClient,
}: {
  ids: string[];
  soClient: SavedObjectsClientContract;
}): Promise<SignalsMigrationSO[]> =>
  findMigrationSavedObjects({
    soClient,
    options: {
      search: ids.map((id) => `${signalsMigrationType}:${id}`).join(' OR '),
      rootSearchFields: ['_id'],
      sortField: 'updated',
      sortOrder: 'desc',
    },
  });
