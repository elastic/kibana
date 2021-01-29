/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GetSignalsMigrationStatusSchema } from './get_signals_migration_status_schema';

export const getSignalsMigrationStatusSchemaMock = (): GetSignalsMigrationStatusSchema => ({
  from: 'now-30d',
});
