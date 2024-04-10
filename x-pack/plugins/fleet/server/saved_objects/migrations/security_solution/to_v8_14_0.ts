/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectUnsanitizedDoc } from '@kbn/core/server';

import type { SavedObjectModelDataBackfillFn } from '@kbn/core-saved-objects-server';

import type { PackagePolicy } from '../../../../common';

const ON_WRITE_SCAN_DEFAULT_VALUE = true;

export const migratePackagePolicyToV8140: SavedObjectModelDataBackfillFn<
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

    policy.windows.malware.on_write_scan ??= ON_WRITE_SCAN_DEFAULT_VALUE;
    policy.mac.malware.on_write_scan ??= ON_WRITE_SCAN_DEFAULT_VALUE;
    policy.linux.malware.on_write_scan ??= ON_WRITE_SCAN_DEFAULT_VALUE;
  }

  return { attributes: updatedPackagePolicyDoc.attributes };
};

export const migratePackagePolicyAddAntivirusRegistrationModeToV8140: SavedObjectModelDataBackfillFn<
  PackagePolicy,
  PackagePolicy
> = (packagePolicyDoc) => {
  if (packagePolicyDoc.attributes.package?.name !== 'endpoint') {
    return { attributes: packagePolicyDoc.attributes };
  }

  const updatedPackagePolicyDoc: SavedObjectUnsanitizedDoc<PackagePolicy> = packagePolicyDoc;

  const input = updatedPackagePolicyDoc.attributes.inputs[0];

  if (input && input.config) {
    const antivirusRegistration = input.config.policy.value.windows.antivirus_registration;

    antivirusRegistration.mode ??= antivirusRegistration.enabled ? 'enabled' : 'disabled';
  }

  return { attributes: updatedPackagePolicyDoc.attributes };
};
