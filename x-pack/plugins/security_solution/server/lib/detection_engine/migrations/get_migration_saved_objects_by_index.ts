/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import { findMigrationSavedObjects } from './find_migration_saved_objects';

import { SignalsMigrationSO } from './saved_objects_schema';

export interface MigrationsByIndex {
  [indexName: string]: SignalsMigrationSO[] | undefined;
}

/**
 * Retrieves a list of migrations SOs for each
 * given signals index.
 *
 * @param soClient An {@link SavedObjectsClientContract}
 * @param index name(s) of the signals index(es)
 *
 * @returns a {@link MigrationsByIndex} object
 *
 * @throws if client returns an error
 */
export const getMigrationSavedObjectsByIndex = async ({
  index,
  soClient,
}: {
  index: string[];
  soClient: SavedObjectsClientContract;
}): Promise<MigrationsByIndex> => {
  const migrationSavedObjects = await findMigrationSavedObjects({
    soClient,
    options: {
      search: index.join(' OR '),
      searchFields: ['sourceIndex'],
      sortField: 'updated',
      sortOrder: 'desc',
    },
  });

  return migrationSavedObjects.reduce<MigrationsByIndex>((agg, migration) => {
    const { sourceIndex } = migration.attributes;
    return {
      ...agg,
      [sourceIndex]: [...(agg[sourceIndex] ?? []), migration],
    };
  }, {});
};
