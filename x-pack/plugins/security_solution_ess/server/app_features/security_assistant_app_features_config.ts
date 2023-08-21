/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AppFeatureAssistantKey,
  type AppFeatureKibanaConfig,
  type AppFeaturesSecurityAssistantConfig,
  type AppFeatureKeys,
  type AssistantSubFeatureId,
  type AppFeatureKey,
} from '@kbn/security-solution-features';

export const getSecurityAssistantAppFeaturesConfigurator =
  (enabledAppFeatureKeys: AppFeatureKeys) => (): AppFeaturesSecurityAssistantConfig => {
    const securityAssistantAppFeatureValues: AppFeatureKey[] =
      Object.values(AppFeatureAssistantKey);
    const casesEnabledAppFeatureKeys = enabledAppFeatureKeys.filter((appFeatureKey) =>
      securityAssistantAppFeatureValues.includes(appFeatureKey)
    ) as AppFeatureAssistantKey[];

    return new Map(
      casesEnabledAppFeatureKeys.map((key) => [key, securityAssistantAppFeaturesConfig[key]])
    );
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
const securityAssistantAppFeaturesConfig: Record<
  AppFeatureAssistantKey,
  AppFeatureKibanaConfig<AssistantSubFeatureId>
> = {
  [AppFeatureAssistantKey.assistant]: {
    privileges: {
      all: {
        ui: ['ai-assistant'],
      },
    },
  },
};
