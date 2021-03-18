/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationFn } from 'kibana/server';

import type { Settings } from '../../types';

export const migrateSettingsToV7130: SavedObjectMigrationFn<
  Settings & {
    package_auto_upgrade: string;
    agent_auto_upgrade: string;
  },
  Settings
> = (settingsDoc) => {
  // @ts-expect-error
  delete settingsDoc.attributes.package_auto_upgrade;
  // @ts-expect-error
  delete settingsDoc.attributes.agent_auto_upgrade;

  return settingsDoc;
};
