/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ExperimentalFeatures } from '@kbn/security-solution-plugin/common';
import type {
  AppFeatureKeys,
  AppFeatureKibanaConfig,
  AppFeaturesSecurityConfig,
} from '@kbn/security-solution-features';
import {
  securityDefaultAppFeaturesConfig,
  createEnabledAppFeaturesConfigMap,
} from '@kbn/security-solution-features/config';
import { AppFeatureSecurityKey, SecuritySubFeatureId } from '@kbn/security-solution-features/keys';

export const getSecurityAppFeaturesConfigurator =
  (enabledAppFeatureKeys: AppFeatureKeys) =>
  (
    _: ExperimentalFeatures // currently un-used, but left here as a convenience for possible future use
  ): AppFeaturesSecurityConfig => {
    return createEnabledAppFeaturesConfigMap(securityAppFeaturesConfig, enabledAppFeatureKeys);
  };

/**
 * Maps the AppFeatures keys to Kibana privileges that will be merged
 * into the base privileges config for the Security app.
 *
 * Privileges can be added in different ways:
 * - `privileges`: the privileges that will be added directly into the main Security feature.
 * - `subFeatureIds`: the ids of the sub-features that will be added into the Security subFeatures entry.
 * - `subFeaturesPrivileges`: the privileges that will be added into the existing Security subFeature with the privilege `id` specified.
 */
const securityAppFeaturesConfig: Record<
  AppFeatureSecurityKey,
  AppFeatureKibanaConfig<SecuritySubFeatureId>
> = {
  ...securityDefaultAppFeaturesConfig,
  [AppFeatureSecurityKey.endpointExceptions]: {
    subFeatureIds: [SecuritySubFeatureId.endpointExceptions],
  },
};
