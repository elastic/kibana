/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationFn, SavedObjectUnsanitizedDoc } from 'kibana/server';
import { cloneDeep } from 'lodash';

import type { PackagePolicy } from '../../../../common';

export const migratePackagePolicyToV7150: SavedObjectMigrationFn<PackagePolicy, PackagePolicy> = (
  packagePolicyDoc
) => {
  const updatedPackagePolicyDoc: SavedObjectUnsanitizedDoc<PackagePolicy> = cloneDeep(
    packagePolicyDoc
  );
  if (packagePolicyDoc.attributes.package?.name === 'endpoint') {
    const input = updatedPackagePolicyDoc.attributes.inputs[0];
    const memory = {
      mode: 'off',
      // This value is based on license.
      // For the migration, we add 'true', our license watcher will correct it, if needed, when the app starts.
      supported: true,
    };
    const memoryPopup = {
      message: '',
      enabled: false,
    };
    if (input && input.config) {
      const policy = input.config.policy.value;

      policy.windows.memory = memory;
      policy.windows.popup.memory = memoryPopup;
    }
  }

  return updatedPackagePolicyDoc;
};
