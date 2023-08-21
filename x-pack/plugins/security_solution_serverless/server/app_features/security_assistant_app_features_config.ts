/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AppFeatureAssistantKey,
  type AppFeatureKey,
  type AppFeatureKeys,
  type AppFeatureKibanaConfig,
  type AppFeaturesSecurityAssistantConfig,
  type AssistantSubFeatureId,
} from '@kbn/security-solution-features';

export const getSecurityAssistantAppFeaturesConfigurator =
  (enabledAppFeatureKeys: AppFeatureKeys) => (): AppFeaturesSecurityAssistantConfig => {
    const securityAssistantAppFeatureValues: AppFeatureKey[] =
      Object.values(AppFeatureAssistantKey);
    const securityAssEnabledAppFeatureKeys = enabledAppFeatureKeys.filter((appFeatureKey) =>
      securityAssistantAppFeatureValues.includes(appFeatureKey)
    ) as AppFeatureAssistantKey[];

    return new Map(
      securityAssEnabledAppFeatureKeys.map((key) => [key, securityAssistantAppFeaturesConfig[key]])
    );
  };

/**
 * Maps the AppFeatures keys to Kibana privileges that will be merged
 * into the base privileges config for the Security Assistant app.
 *
 * Privileges can be added in different ways:
 * - `privileges`: the privileges that will be added directly into the main Security Assistant feature.
 * - `subFeatureIds`: the ids of the sub-features that will be added into the Assistant subFeatures entry.
 * - `subFeaturesPrivileges`: the privileges that will be added into the existing Assistant subFeature with the privilege `id` specified.
 */
const securityAssistantAppFeaturesConfig: Record<
  AppFeatureAssistantKey,
  AppFeatureKibanaConfig<AssistantSubFeatureId>
> = {
  [AppFeatureAssistantKey.assistant]: {
    privileges: {
      all: {
        ui: ['ai-assistant'], // Add cases connector UI privileges
      },
    },
  },
};
