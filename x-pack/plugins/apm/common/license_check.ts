/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ILicense, LicenseType } from '../../licensing/common/types';

function isActiveLicense(licenseType: LicenseType, license?: ILicense) {
  return license && license.isActive && license.hasAtLeast(licenseType);
}

export function isActivePlatinumLicense(license?: ILicense) {
  return isActiveLicense('platinum', license);
}

export function isActiveGoldLicense(license?: ILicense) {
  return isActiveLicense('gold', license);
}
