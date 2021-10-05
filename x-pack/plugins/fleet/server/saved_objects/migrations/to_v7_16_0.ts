/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationFn } from 'kibana/server';

import type { Installation } from '../../../common';
import { AUTO_UPDATE_PACKAGES, DEFAULT_PACKAGES } from '../../../common';

export const migrateInstallationToV7160: SavedObjectMigrationFn<Installation, Installation> = (
  installationDoc,
  migrationContext
) => {
  const updatedInstallationDoc = installationDoc;

  if (
    [...AUTO_UPDATE_PACKAGES, ...DEFAULT_PACKAGES].some(
      (pkg) => pkg.name === updatedInstallationDoc.attributes.name
    )
  ) {
    updatedInstallationDoc.attributes.keep_policies_up_to_date = true;
  }

  return updatedInstallationDoc;
};
