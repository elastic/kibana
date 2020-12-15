/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FinalizeSignalsMigrationSchema } from './finalize_signals_migration_schema';

export const getFinalizeSignalsMigrationSchemaMock = (): FinalizeSignalsMigrationSchema => ({
  migration_ids: ['migrationSOIdentifier'],
});
