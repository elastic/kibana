/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectMigrationFn } from 'kibana/server';
import { PackagePolicy } from '../../types';

export const migratePackagePolicyToV7110: SavedObjectMigrationFn<PackagePolicy, PackagePolicy> = (
  packagePolicyDoc
) => {
  packagePolicyDoc.attributes.inputs = packagePolicyDoc.attributes.inputs.map((input) => ({
    ...input,
    id: `${input.type}-${packagePolicyDoc.id}`,
  }));

  return packagePolicyDoc;
};
