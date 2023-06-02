/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import {
  ApmFeatureFlagName,
  getApmFeatureFlags,
  ValueOfApmFeatureFlag,
} from '../../common/apm_feature_flags';

export function useApmFeatureFlag<
  TApmFeatureFlagName extends ApmFeatureFlagName
>(
  featureFlag: TApmFeatureFlagName
): ValueOfApmFeatureFlag<TApmFeatureFlagName> {
  const featureFlags = useMemo(() => {
    // this should be replaced with an API call
    return getApmFeatureFlags();
  }, []);

  return featureFlags[featureFlag];
}
