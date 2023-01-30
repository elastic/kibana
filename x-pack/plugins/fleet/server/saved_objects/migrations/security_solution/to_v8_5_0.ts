/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationFn, SavedObjectUnsanitizedDoc } from '@kbn/core/server';

import type { PackagePolicy } from '../../../../common';

export const migratePackagePolicyToV850: SavedObjectMigrationFn<PackagePolicy, PackagePolicy> = (
  packagePolicyDoc
) => {
  if (packagePolicyDoc.attributes.package?.name !== 'endpoint') {
    return packagePolicyDoc;
  }

  const updatedPackagePolicyDoc: SavedObjectUnsanitizedDoc<PackagePolicy> = packagePolicyDoc;

  const input = updatedPackagePolicyDoc.attributes.inputs[0];

  if (input && input.config) {
    const policy = input.config.policy.value;

    policy.linux.events.tty_io = false;
  }

  return updatedPackagePolicyDoc;
};
