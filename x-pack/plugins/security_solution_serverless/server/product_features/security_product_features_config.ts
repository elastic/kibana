/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  ProductFeatureKeys,
  ProductFeatureKibanaConfig,
  ProductFeaturesSecurityConfig,
} from '@kbn/security-solution-features';
import {
  securityDefaultProductFeaturesConfig,
  createEnabledProductFeaturesConfigMap,
} from '@kbn/security-solution-features/config';
import {
  ProductFeatureSecurityKey,
  SecuritySubFeatureId,
} from '@kbn/security-solution-features/keys';
import type { ExperimentalFeatures } from '../../common/experimental_features';

export const getSecurityProductFeaturesConfigurator =
  (
    enabledProductFeatureKeys: ProductFeatureKeys,
    _: ExperimentalFeatures // currently un-used, but left here as a convenience for possible future use
  ) =>
  (): ProductFeaturesSecurityConfig => {
    return createEnabledProductFeaturesConfigMap(
      securityProductFeaturesConfig,
      enabledProductFeatureKeys
    );
  };

/**
 * Maps the ProductFeatures keys to Kibana privileges that will be merged
 * into the base privileges config for the Security app.
 *
 * Privileges can be added in different ways:
 * - `privileges`: the privileges that will be added directly into the main Security feature.
 * - `subFeatureIds`: the ids of the sub-features that will be added into the Security subFeatures entry.
 * - `subFeaturesPrivileges`: the privileges that will be added into the existing Security subFeature with the privilege `id` specified.
 */
const securityProductFeaturesConfig: Record<
  ProductFeatureSecurityKey,
  ProductFeatureKibanaConfig<SecuritySubFeatureId>
> = {
  ...securityDefaultProductFeaturesConfig,
  [ProductFeatureSecurityKey.endpointExceptions]: {
    subFeatureIds: [SecuritySubFeatureId.endpointExceptions],
  },
  [ProductFeatureSecurityKey.ruleManagement]: {
    subFeatureIds: [SecuritySubFeatureId.ruleManagement],
  },
};
