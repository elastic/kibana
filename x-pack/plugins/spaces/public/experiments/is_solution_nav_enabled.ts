/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { FeatureFlagsStart } from '@kbn/core-feature-flags-browser';

const SOLUTION_NAV_FEATURE_FLAG_NAME = 'solutionNavEnabled';

export const isSolutionNavEnabled = (featureFlags: FeatureFlagsStart, cloud?: CloudStart) => {
  return Boolean(cloud?.isCloudEnabled)
    ? featureFlags.getBooleanValue(SOLUTION_NAV_FEATURE_FLAG_NAME, false)
    : false;
};
