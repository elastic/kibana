/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { cloneDeep } from 'lodash';

import type { SavedObjectMigrationFn } from '../../../../../../../src/core/server/saved_objects/migrations/types';
import type { SavedObjectUnsanitizedDoc } from '../../../../../../../src/core/server/saved_objects/serialization/types';
import type { PackagePolicy } from '../../../../common/types/models/package_policy';

export const migratePackagePolicyToV7110: SavedObjectMigrationFn<PackagePolicy, PackagePolicy> = (
  packagePolicyDoc
) => {
  const updatedPackagePolicyDoc: SavedObjectUnsanitizedDoc<PackagePolicy> = cloneDeep(
    packagePolicyDoc
  );
  if (packagePolicyDoc.attributes.package?.name === 'endpoint') {
    const input = updatedPackagePolicyDoc.attributes.inputs[0];
    const popup = {
      malware: {
        message: '',
        enabled: false,
      },
    };
    if (input && input.config) {
      const policy = input.config.policy.value;

      policy.windows.antivirus_registration = policy.windows.antivirus_registration || {
        enabled: false,
      };
      policy.windows.popup = popup;
      policy.mac.popup = popup;
    }
  }

  return updatedPackagePolicyDoc;
};
