/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaFeature, SubFeaturePrivilegeConfig } from '../../common';
import type { LicenseType } from '../../../licensing/server';

/**
 * Utility for iterating through all sub-feature privileges belonging to a specific feature.
 *
 * @param feature the feature whose sub-feature privileges to iterate through.
 * @param licenseType the current license.
 */
export type SubFeaturePrivilegeIterator = (
  feature: KibanaFeature,
  licenseType: LicenseType
) => IterableIterator<SubFeaturePrivilegeConfig>;

const subFeaturePrivilegeIterator: SubFeaturePrivilegeIterator = function* subFeaturePrivilegeIterator(
  feature: KibanaFeature,
  licenseType: LicenseType
): IterableIterator<SubFeaturePrivilegeConfig> {
  for (const subFeature of feature.subFeatures) {
    for (const group of subFeature.privilegeGroups) {
      yield* group.privileges.filter(
        (privilege) => !privilege.minimumLicense || privilege.minimumLicense <= licenseType
      );
    }
  }
};

export { subFeaturePrivilegeIterator };
