/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type {
  CloudExperimentsFeatureFlagNames,
  CloudExperimentsPluginStart,
} from '@kbn/cloud-experiments-plugin/common';
/**
 * Retrieves the variation of the feature flag if the cloudExperiments plugin is enabled.
 * @param cloudExperiments {@link CloudExperimentsPluginStart}
 * @param featureFlagName The name of the feature flag {@link CloudExperimentsFeatureFlagNames}
 * @param defaultValue The default value in case it cannot retrieve the feature flag
 * @param setter The setter from {@link useState} to update the value.
 */
export const useVariation = <Data>(
  cloudExperiments: CloudExperimentsPluginStart | undefined,
  featureFlagName: CloudExperimentsFeatureFlagNames,
  defaultValue: Data,
  setter: (value: Data) => void
) => {
  useEffect(() => {
    (async function loadVariation() {
      const variationUrl = await cloudExperiments?.getVariation(featureFlagName, defaultValue);
      if (variationUrl) {
        setter(variationUrl);
      }
    })();
  }, [cloudExperiments, featureFlagName, defaultValue, setter]);
};
