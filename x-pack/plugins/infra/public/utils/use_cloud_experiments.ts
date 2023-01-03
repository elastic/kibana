/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CloudExperimentsFeatureFlagNames,
  CloudExperimentsPluginStart,
} from '@kbn/cloud-experiments-plugin/common';
import { useEffect } from 'react';

export const useCloudExperiments = <Data>(
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
