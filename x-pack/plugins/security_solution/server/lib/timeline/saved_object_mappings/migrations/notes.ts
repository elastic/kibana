/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectMigrationMap } from '@kbn/core/server';
import { migrateTimelineIdToReferences } from './utils';

export const notesMigrations: SavedObjectMigrationMap = {
  '7.16.0': migrateTimelineIdToReferences,
};
