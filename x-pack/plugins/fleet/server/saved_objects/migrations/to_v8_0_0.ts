/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationFn } from 'kibana/server';

import type { Installation, Output } from '../../../common';
import { MANAGED_PACKAGES } from '../../../common';

export const migrateOutputToV800: SavedObjectMigrationFn<Output, Output> = (
  outputDoc,
  migrationContext
) => {
  if (outputDoc.attributes.is_default) {
    outputDoc.attributes.is_default_monitoring = true;
  }

  return outputDoc;
};

export const migrateInstallationToV800: SavedObjectMigrationFn<Installation, Installation> = (
  installationDoc,
  migrationContext
) => {
  const updatedInstallationDoc = installationDoc;

  const isManagedPackage = MANAGED_PACKAGES.some(
    (pkg) => pkg.name === updatedInstallationDoc.attributes.name
  );

  // Set all default + auto_update packages to `keep_policies_up_to_date: true` by default, unless the
  // field has already been explicitly set
  if (
    isManagedPackage &&
    updatedInstallationDoc.attributes.keep_policies_up_to_date === undefined
  ) {
    updatedInstallationDoc.attributes.keep_policies_up_to_date = true;
  }

  return updatedInstallationDoc;
};
