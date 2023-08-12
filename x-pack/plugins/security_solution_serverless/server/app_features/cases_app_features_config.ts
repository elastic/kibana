/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_ID } from '@kbn/security-solution-plugin/common';
import {
  AppFeatureCasesKey,
  type AppFeatureKibanaConfig,
  type AppFeaturesCasesConfig,
  type AppFeatureKeys,
  type CasesSubFeatureId,
  type AppFeatureKey,
} from '@kbn/security-solution-features';

import {
  CASES_CONNECTORS_CAPABILITY,
  GET_CONNECTORS_CONFIGURE_API_TAG,
} from '@kbn/cases-plugin/common/constants';

export const getCasesAppFeaturesConfigurator =
  (enabledAppFeatureKeys: AppFeatureKeys) => (): AppFeaturesCasesConfig => {
    const casesAppFeatureValues: AppFeatureKey[] = Object.values(AppFeatureCasesKey);
    const casesEnabledAppFeatureKeys = enabledAppFeatureKeys.filter((appFeatureKey) =>
      casesAppFeatureValues.includes(appFeatureKey)
    ) as AppFeatureCasesKey[];

    return new Map(casesEnabledAppFeatureKeys.map((key) => [key, casesAppFeaturesConfig[key]]));
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
  [AppFeatureCasesKey.casesConnectors]: {
    privileges: {
      all: {
        api: [GET_CONNECTORS_CONFIGURE_API_TAG], // Add cases connector get connectors API privileges
        ui: [CASES_CONNECTORS_CAPABILITY], // Add cases connector UI privileges
        cases: {
          push: [APP_ID], // Add cases connector push privileges
        },
      },
      read: {
        api: [GET_CONNECTORS_CONFIGURE_API_TAG], // Add cases connector get connectors API privileges
        ui: [CASES_CONNECTORS_CAPABILITY], // Add cases connector UI privileges
      },
    },
  },
};
