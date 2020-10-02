/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LicenseType } from '../../licensing/common/types';
import { LicensingPluginSetup, LicensingPluginStart } from '../../licensing/public';

export enum LICENSED_FEATURES {
  GEO_SHAPE_AGGS = 'GEO_SHAPE_AGGS',
}

export interface LicensedFeatureDetail {
  name: string;
  license: LicenseType;
}

export const LICENCED_FEATURES_DETAILS: Record<LICENSED_FEATURES, LicensedFeatureDetail> = {
  [LICENSED_FEATURES.GEO_SHAPE_AGGS]: {
    name: 'geo aggs on geo_shape fields',
    license: 'gold',
  },
};

export function registerLicensedFeatures(licensingPlugin: LicensingPluginSetup) {
  for (const licensedFeature of LICENSED_FEATURES) {
    licensingPlugin.featureUsage.register(
      LICENCED_FEATURES_DETAILS[LICENSED_FEATURES.licensedFeature].name,
      LICENCED_FEATURES_DETAILS[LICENSED_FEATURES.licensedFeature].license
    );
  }
}

let licensingPluginStart: LicensingPluginStart;
export function setLicensingPluginStart(licensingPlugin) {
  licensingPluginStart = licensingPlugin;
}

export function notifyLicensedFeatureUsage(feature: LICENSED_FEATURES) {
  if (!licensingPluginStart) {
    // eslint-disable-next-line no-console
    console.error('May not call notifyLicensedFeatureUsage before setting notifier');
  }
  licensingPluginStart.featureUsage.notifyUsage(LICENCED_FEATURES_DETAILS[feature].name);
}
