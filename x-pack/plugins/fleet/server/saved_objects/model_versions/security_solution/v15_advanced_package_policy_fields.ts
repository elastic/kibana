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

export const packagePolicyV15AdvancedFieldsForEndpointV816: SavedObjectModelDataBackfillFn<
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

    policy.windows.advanced = {
      ...policy.windows.advanced,
      events: {
        aggregate_process: false,
        ...policy.windows.advanced?.events,
      },
    };

    policy.mac.advanced = {
      ...policy.mac.advanced,
      events: {
        aggregate_process: false,
        ...policy.mac.advanced?.events,
      },
    };

    policy.linux.advanced = {
      ...policy.linux.advanced,
      events: {
        aggregate_process: false,
        ...policy.linux.advanced?.events,
      },
    };
  }

  return { attributes: updatedPackagePolicyDoc.attributes };
};
