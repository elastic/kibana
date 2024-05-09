/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core-saved-objects-common/src/server_types';

import type { PackagePolicy, PackagePolicySOAttributes } from '../../types';

export const mapPackagePolicySavedObjectToPackagePolicy = ({
  /* eslint-disable @typescript-eslint/naming-convention */
  id,
  version,
  attributes: {
    name,
    description,
    namespace,
    enabled,
    is_managed,
    policy_id,
    // `package` is a reserved keyword
    package: packageInfo,
    inputs,
    vars,
    elasticsearch,
    agents,
    revision,
    secret_references,
    updated_at,
    updated_by,
    created_at,
    created_by,
    /* eslint-enable @typescript-eslint/naming-convention */
  },
}: SavedObject<PackagePolicySOAttributes>): PackagePolicy => {
  return {
    id,
    name,
    description,
    namespace,
    enabled,
    is_managed,
    policy_id,
    package: packageInfo,
    inputs,
    vars,
    elasticsearch,
    version,
    agents,
    revision,
    secret_references,
    updated_at,
    updated_by,
    created_at,
    created_by,
  };
};
