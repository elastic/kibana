/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LicenseType } from '../../../../../licensing/server';

import { KibanaFeature, SubFeaturePrivilegeConfig } from '../../../../../features/common';

export function* subFeaturePrivilegeIterator(
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
}
