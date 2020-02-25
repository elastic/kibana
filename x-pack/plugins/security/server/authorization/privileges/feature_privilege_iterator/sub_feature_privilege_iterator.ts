/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SubFeaturePrivilegeConfig } from '../../../../../features/common';
import { Feature } from '../../../../../features/server';

export function* subFeaturePrivilegeIterator(
  feature: Feature
): IterableIterator<SubFeaturePrivilegeConfig> {
  for (const subFeature of feature.subFeatures) {
    for (const group of subFeature.privilegeGroups) {
      yield* group.privileges;
    }
  }
}
