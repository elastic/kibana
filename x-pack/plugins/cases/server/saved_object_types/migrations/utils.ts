/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogMeta, SavedObjectMigrationContext } from '@kbn/core/server';

interface MigrationLogMeta extends LogMeta {
  migrations: {
    [x: string]: {
      id: string;
    };
  };
}

export function logError({
  id,
  context,
  error,
  docType,
  docKey,
}: {
  id: string;
  context: SavedObjectMigrationContext;
  error: Error;
  docType: string;
  docKey: string;
}) {
  context.log.error<MigrationLogMeta>(
    `Failed to migrate ${docType} with doc id: ${id} version: ${context.migrationVersion} error: ${error.message}`,
    {
      migrations: {
        [docKey]: {
          id,
        },
      },
    }
  );
}
