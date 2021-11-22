/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationFn } from 'kibana/server';

import type { Installation, Output } from '../../../common';
import { AUTO_UPGRADE_POLICIES_PACKAGES } from '../../../common';

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

  const shouldKeepPoliciesUpToDate = AUTO_UPGRADE_POLICIES_PACKAGES.some(
    (pkg) => pkg.name === updatedInstallationDoc.attributes.name
  );

  if (shouldKeepPoliciesUpToDate) {
    updatedInstallationDoc.attributes.keep_policies_up_to_date = true;
  }

  return updatedInstallationDoc;
};
