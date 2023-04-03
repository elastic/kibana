/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  KibanaFeatureConfig,
  PluginSetupContract as FeaturesPluginSetup,
} from '@kbn/features-plugin/server';
import type { ExperimentalFeatures } from '../../../common';
import type { AppFeaturesMap } from './app_features';
import {
  SECURITY_SOLUTION_FEATURE_ID,
  CASES_FEATURE_ID,
  getSecuritySolutionKibanaFeature,
  getCasesKibanaFeature,
} from './kibana_features';

export const registerKibanaFeatures = (
  featuresSetup: FeaturesPluginSetup,
  appFeatures: AppFeaturesMap,
  experimentalFeatures: ExperimentalFeatures
) => {
  featuresSetup.unregisterKibanaFeature(SECURITY_SOLUTION_FEATURE_ID);
  featuresSetup.registerKibanaFeature(
    filterSecurityFeature(appFeatures, getSecuritySolutionKibanaFeature(experimentalFeatures))
  );
  featuresSetup.unregisterKibanaFeature(CASES_FEATURE_ID);
  featuresSetup.registerKibanaFeature(
    filterSecurityCasesFeature(appFeatures, getCasesKibanaFeature())
  );
};

const filterSecurityFeature = (
  appFeatures: AppFeaturesMap,
  securityFeature: KibanaFeatureConfig
): KibanaFeatureConfig => {
  if (!securityFeature.privileges) {
    return securityFeature;
  }
  const privileges = {
    ...securityFeature.privileges,
  };

  // TODO: decide if it's better to do it the other way around, and only add the privileges if the feature is enabled
  if (!appFeatures.get('rules_load_prepackaged')) {
    privileges.all = {
      ...privileges.all,
      api: privileges.all.api?.filter((api) => api !== 'load-prebuilt-rules'),
      ui: privileges.all.ui?.filter((ui) => ui !== 'prebuilt-rules'),
    };
  }

  // we'll be able to add/remove sub-features here based on allowed features

  // console.log('privileges all api', privileges.all.api);
  return { ...securityFeature, privileges };
};

const filterSecurityCasesFeature = (
  appFeatures: AppFeaturesMap,
  securityCasesFeature: KibanaFeatureConfig
): KibanaFeatureConfig => {
  if (!securityCasesFeature.privileges) {
    return securityCasesFeature;
  }

  if (!appFeatures.get('cases_base')) {
    const { all, read } = securityCasesFeature.privileges;
    const privileges = {
      all: {
        ...all,
        ...privilegeReset(),
      },
      read: {
        ...read,
        ...privilegeReset(),
      },
    };
    return { ...securityCasesFeature, privileges, subFeatures: [] };
  }

  return securityCasesFeature;
};

const privilegeReset = () => ({
  api: [],
  ui: [],
  savedObject: {
    all: [],
    read: [],
  },
});
