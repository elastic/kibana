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

export const migratePackagePolicyToV8110: SavedObjectModelDataBackfillFn<
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

    policy.global_manifest_version = 'latest';
  }

  return {
    attributes: {
      inputs: updatedPackagePolicyDoc.attributes.inputs,
    },
  };
};

export const migratePackagePolicyEvictionsFromV8110: SavedObjectModelVersionForwardCompatibilityFn =
  (unknownAttributes) => {
    const attributes = unknownAttributes as PackagePolicy;
    if (attributes.package?.name !== 'endpoint') {
      return attributes;
    }

    const updatedAttributes = attributes;

    const input = updatedAttributes.inputs[0];

    if (input && input.config) {
      input.config.policy.value = omit(input.config.policy.value, ['global_manifest_version']);
    }

    return updatedAttributes;
  };
