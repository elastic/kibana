/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ILicense, LicenseType } from '@kbn/licensing-plugin/common/types';
import { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { APP_ID } from '../common/constants';

export enum LICENSED_FEATURES {
  GEO_LINE_AGG = 'GEO_LINE_AGG',
  GEO_SHAPE_AGGS_GEO_TILE = 'GEO_SHAPE_AGGS_GEO_TILE',
  ON_PREM_EMS = 'ON_PREM_EMS',
}

export interface LicensedFeatureDetail {
  name: string;
  license: LicenseType;
}

export const LICENCED_FEATURES_DETAILS: Record<LICENSED_FEATURES, LicensedFeatureDetail> = {
  [LICENSED_FEATURES.GEO_LINE_AGG]: {
    name: 'geo_line aggregation',
    license: 'gold',
  },
  [LICENSED_FEATURES.GEO_SHAPE_AGGS_GEO_TILE]: {
    name: 'geo_tile aggregation on geo_shape field-type',
    license: 'gold',
  },
  [LICENSED_FEATURES.ON_PREM_EMS]: {
    name: 'layer from local Elastic Maps Server',
    license: 'enterprise',
  },
};

let licenseId: string | undefined;
let isGoldPlus: boolean = false;
export const getLicenseId = () => licenseId;
export const getIsGoldPlus = () => isGoldPlus;

let licensingPluginStart: LicensingPluginStart;
let initializeLicense: (value: unknown) => void;
const licenseInitialized = new Promise((resolve) => {
  initializeLicense = resolve;
});
export const whenLicenseInitialized = async (): Promise<void> => {
  await licenseInitialized;
};

export async function setLicensingPluginStart(licensingPlugin: LicensingPluginStart) {
  const license = await licensingPlugin.refresh();
  updateLicenseState(license);

  licensingPluginStart = licensingPlugin;
  licensingPluginStart.license$.subscribe(updateLicenseState);

  initializeLicense(undefined);
}

function updateLicenseState(license: ILicense) {
  const gold = license.check(APP_ID, 'gold');
  isGoldPlus = gold.state === 'valid';
  licenseId = license.uid;
}

export function registerLicensedFeatures(licensingPlugin: LicensingPluginSetup) {
  for (const licensedFeature of Object.values(LICENSED_FEATURES)) {
    licensingPlugin.featureUsage.register(
      LICENCED_FEATURES_DETAILS[licensedFeature].name,
      LICENCED_FEATURES_DETAILS[licensedFeature].license
    );
  }
}

export function notifyLicensedFeatureUsage(licensedFeature: LICENSED_FEATURES) {
  if (!licensingPluginStart) {
    // eslint-disable-next-line no-console
    console.error('May not call notifyLicensedFeatureUsage before plugin start');
    return;
  }
  licensingPluginStart.featureUsage.notifyUsage(
    LICENCED_FEATURES_DETAILS[LICENSED_FEATURES[licensedFeature]].name
  );
}
