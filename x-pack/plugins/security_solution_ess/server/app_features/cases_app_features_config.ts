/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  AppFeatureKibanaConfig,
  AppFeaturesCasesConfig,
  AppFeatureKeys,
} from '@kbn/security-solution-features';
import type { AppFeatureCasesKey, CasesSubFeatureId } from '@kbn/security-solution-features/keys';
import {
  getCasesDefaultAppFeaturesConfig,
  createEnabledAppFeaturesConfigMap,
} from '@kbn/security-solution-features/config';

import {
  CASES_CONNECTORS_CAPABILITY,
  GET_CONNECTORS_CONFIGURE_API_TAG,
} from '@kbn/cases-plugin/common/constants';

export const getCasesAppFeaturesConfigurator =
  (enabledAppFeatureKeys: AppFeatureKeys) => (): AppFeaturesCasesConfig => {
    return createEnabledAppFeaturesConfigMap(casesAppFeaturesConfig, enabledAppFeatureKeys);
  };

/**
 * Maps the AppFeatures keys to Kibana privileges that will be merged
 * into the base privileges config for the Security Cases app.
 *
 * Privileges can be added in different ways:
 * - `privileges`: the privileges that will be added directly into the main Security Cases feature.
 * - `subFeatureIds`: the ids of the sub-features that will be added into the Cases subFeatures entry.
 * - `subFeaturesPrivileges`: the privileges that will be added into the existing Cases subFeature with the privilege `id` specified.
 */
const casesAppFeaturesConfig: Record<
  AppFeatureCasesKey,
  AppFeatureKibanaConfig<CasesSubFeatureId>
> = {
  ...getCasesDefaultAppFeaturesConfig({
    apiTags: { connectors: GET_CONNECTORS_CONFIGURE_API_TAG },
    uiCapabilities: { connectors: CASES_CONNECTORS_CAPABILITY },
  }),
  // ess-specific app features configs here
};
