/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CreateSignalsMigrationSchema } from './create_signals_migration_schema';

export const getCreateSignalsMigrationSchemaMock = (
  index: string = 'signals-index'
): CreateSignalsMigrationSchema => ({
  index: [index],
});
