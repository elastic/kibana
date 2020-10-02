/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILicense, LicenseType } from '../../licensing/common/types';
import { LicensingPluginSetup, LicensingPluginStart } from '../../licensing/public';
import { APP_ID } from '../common/constants';

export enum LICENSED_FEATURES {
  GEO_SHAPE_AGGS_GEO_TILE = 'GEO_SHAPE_AGGS_GEO_TILE',
}

export interface LicensedFeatureDetail {
  name: string;
  license: LicenseType;
}

export const LICENCED_FEATURES_DETAILS: Record<LICENSED_FEATURES, LicensedFeatureDetail> = {
  [LICENSED_FEATURES.GEO_SHAPE_AGGS_GEO_TILE]: {
    name: 'geo aggs on geo_shape fields',
    license: 'gold',
  },
};

let licenseId: string | undefined;
let isGoldPlus: boolean = false;

export const getLicenseId = () => licenseId;
export const getIsGoldPlus = () => isGoldPlus;

export function registerLicensedFeatures(licensingPlugin: LicensingPluginSetup) {
  // eslint-disable-next-line guard-for-in
  for (const licensedFeature in LICENSED_FEATURES) {
    licensingPlugin.featureUsage.register(
      LICENCED_FEATURES_DETAILS[LICENSED_FEATURES[licensedFeature]].name,
      LICENCED_FEATURES_DETAILS[LICENSED_FEATURES[licensedFeature]].license
    );
  }
}

let licensingPluginStart: LicensingPluginStart;
export function setLicensingPluginStart(licensingPlugin) {
  licensingPluginStart = licensingPlugin;
  licensingPluginStart.license$.subscribe((license: ILicense) => {
    const gold = license.check(APP_ID, LICENCED_FEATURES_DETAILS.GEO_SHAPE_AGGS.license);
    isGoldPlus = gold.state === 'valid';
    licenseId = license.uid;
  });
}

export function notifyLicensedFeatureUsage(feature: LICENSED_FEATURES) {
  if (!licensingPluginStart) {
    // eslint-disable-next-line no-console
    console.error('May not call notifyLicensedFeatureUsage before setting notifier');
  }
  licensingPluginStart.featureUsage.notifyUsage(LICENCED_FEATURES_DETAILS[feature].name);
}
