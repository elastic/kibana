/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectMigrationFn, SavedObjectUnsanitizedDoc } from 'kibana/server';
import { cloneDeep } from 'lodash';
import { PackagePolicy } from '../../../../../fleet/common';
import { ProtectionModes } from '../../types';

export const migratePackagePolicyToV7120: SavedObjectMigrationFn<PackagePolicy, PackagePolicy> = (
  packagePolicyDoc
) => {
  const updatedPackagePolicyDoc: SavedObjectUnsanitizedDoc<PackagePolicy> = cloneDeep(
    packagePolicyDoc
  );
  if (packagePolicyDoc.attributes.package?.name === 'endpoint') {
    const input = updatedPackagePolicyDoc.attributes.inputs[0];
    const ransomware = {
      message: '',
      enabled: false,
    };
    if (input && input.config) {
      const policy = input.config.policy.value;

      policy.windows.ransomware = ProtectionModes.off;
      policy.mac.ransomware = ProtectionModes.off;
      policy.windows.popup.ransomware = ransomware;
      policy.mac.popup.ransomware = ransomware;
    }
  }

  return updatedPackagePolicyDoc;
};
