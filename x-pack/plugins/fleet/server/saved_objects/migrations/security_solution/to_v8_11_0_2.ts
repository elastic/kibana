/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectUnsanitizedDoc } from '@kbn/core/server';

import type { SavedObjectModelDataBackfillFn } from '@kbn/core-saved-objects-server';

import { omit } from 'lodash';

import type { SavedObjectModelVersionForwardCompatibilityFn } from '@kbn/core-saved-objects-server';

import type { PackagePolicy } from '../../../../common';

export const migratePackagePolicyToV81102: SavedObjectModelDataBackfillFn<
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

    const newMetaValues = {
      license_uuid: policy?.meta?.license_uid ? policy.meta.license_uid : '',
    };

    policy.meta = policy?.meta ? { ...policy.meta, ...newMetaValues } : newMetaValues;
  }

  return {
    attributes: {
      inputs: updatedPackagePolicyDoc.attributes.inputs,
    },
  };
};

export const migratePackagePolicyEvictionsFromV81102: SavedObjectModelVersionForwardCompatibilityFn =
  (unknownAttributes) => {
    const attributes = unknownAttributes as PackagePolicy;
    if (attributes.package?.name !== 'endpoint') {
      return attributes;
    }

    const updatedAttributes = attributes;

    const input = updatedAttributes.inputs[0];

    if (input && input.config) {
      const policy = input.config.policy.value;

      policy.meta = omit(policy.meta, ['license_uuid']);
    }

    return updatedAttributes;
  };
