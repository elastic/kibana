/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaFeature } from '@kbn/features-plugin/server';

export function validateFeaturePrivileges(features: KibanaFeature[]) {
  for (const feature of features) {
    const seenPrivilegeIds = new Set<string>();
    Object.keys(feature.privileges ?? {}).forEach((privilegeId) => {
      seenPrivilegeIds.add(privilegeId);
      seenPrivilegeIds.add(`minimal_${privilegeId}`);
    });

    const subFeatureEntries = feature.subFeatures ?? [];
    subFeatureEntries.forEach((subFeature) => {
      subFeature.privilegeGroups.forEach((subFeaturePrivilegeGroup) => {
        subFeaturePrivilegeGroup.privileges.forEach((subFeaturePrivilege) => {
          if (seenPrivilegeIds.has(subFeaturePrivilege.id)) {
            throw new Error(
              `KibanaFeature '${feature.id}' already has a privilege with ID '${subFeaturePrivilege.id}'. Sub feature '${subFeature.name}' cannot also specify this.`
            );
          }
          seenPrivilegeIds.add(subFeaturePrivilege.id);
        });
      });
    });
  }
}
