/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationFn } from '@kbn/core/server';

import type { Settings } from '../../../common/types';

export const migrateSettingsToV860: SavedObjectMigrationFn<Settings, Settings> = (
  settingsDoc,
  migrationContext
) => {
  // @ts-expect-error has_seen_fleet_migration_notice property does not exists anymore
  delete settingsDoc.attributes.has_seen_fleet_migration_notice;

  return settingsDoc;
};
