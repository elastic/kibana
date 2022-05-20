/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationFn } from '@kbn/core/server';

import type { Installation } from '../../../common';

export const migrateInstallationToV830: SavedObjectMigrationFn<Installation, Installation> = (
  installationDoc,
  migrationContext
) => {
  delete installationDoc.attributes.removable;

  return installationDoc;
};
