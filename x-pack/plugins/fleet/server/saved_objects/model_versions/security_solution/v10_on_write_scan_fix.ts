/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectModelDataBackfillFn,
  SavedObjectUnsanitizedDoc,
} from '@kbn/core-saved-objects-server';

import type { PackagePolicy } from '../../../../common';

export const packagePolicyV10OnWriteScanFix: SavedObjectModelDataBackfillFn<
  PackagePolicy,
  PackagePolicy
> = (packagePolicyDoc) => {
  if (packagePolicyDoc.attributes.package?.name !== 'endpoint') {
    return { attributes: packagePolicyDoc.attributes };
  }

  const updatedPackagePolicyDoc: SavedObjectUnsanitizedDoc<PackagePolicy> = packagePolicyDoc;

  const input = updatedPackagePolicyDoc.attributes.inputs[0];

  if (input && input.config) {
    const policy = input.config.policy.value;

    if (policy.windows.malware.mode === 'off') {
      policy.windows.malware.on_write_scan = false;
    }
    if (policy.mac.malware.mode === 'off') {
      policy.mac.malware.on_write_scan = false;
    }
    if (policy.linux.malware.mode === 'off') {
      policy.linux.malware.on_write_scan = false;
    }
  }

  return { attributes: updatedPackagePolicyDoc.attributes };
};
