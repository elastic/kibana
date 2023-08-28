/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppFeatureAssistantKey } from '@kbn/security-solution-features';
import {
  assistantDefaultAppFeaturesConfig,
  createEnabledAppFeaturesConfigMap,
  type AppFeatureKeys,
  type AppFeatureKibanaConfig,
  type AppFeaturesAssistantConfig,
  type AssistantSubFeatureId,
} from '@kbn/security-solution-features';

export const getSecurityAssistantAppFeaturesConfigurator =
  (enabledAppFeatureKeys: AppFeatureKeys) => (): AppFeaturesAssistantConfig => {
    return createEnabledAppFeaturesConfigMap(assistantAppFeaturesConfig, enabledAppFeatureKeys);
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
const assistantAppFeaturesConfig: Record<
  AppFeatureAssistantKey,
  AppFeatureKibanaConfig<AssistantSubFeatureId>
> = {
  ...assistantDefaultAppFeaturesConfig,
  // ess-specific app features configs here
};
