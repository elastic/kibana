/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RANKED_LICENSE_TYPES, LICENSE_STATUS } from '../constants';

export function checkLicense(pluginName, minimumLicenseRequired, xpackLicenseInfo) {
  if(!RANKED_LICENSE_TYPES.includes(minimumLicenseRequired)) {
    throw new Error(`Invalid license type supplied to checkLicense: ${minimumLicenseRequired}`);
  }

  // If, for some reason, we cannot get the license information
  // from Elasticsearch, assume worst case and disable
  if (!xpackLicenseInfo || !xpackLicenseInfo.isAvailable()) {
    return {
      isAvailable: false,
      status: LICENSE_STATUS.UNAVAILABLE,
      message: `You cannot use ${pluginName} because license information is not available at this time.`
    };
  }

  const { license } = xpackLicenseInfo;
  const isLicenseModeValid = license.isOneOf([...RANKED_LICENSE_TYPES].splice(RANKED_LICENSE_TYPES.indexOf(minimumLicenseRequired)));
  const isLicenseActive = license.isActive();
  const licenseType = license.getType();

  // License is not valid
  if (!isLicenseModeValid) {
    return {
      isAvailable: false,
      status: LICENSE_STATUS.INVALID,
      message: `Your ${licenseType} license does not support ${pluginName}. Please upgrade your license.`
    };
  }

  // License is valid but not active
  if (!isLicenseActive) {
    return {
      isAvailable: false,
      status: LICENSE_STATUS.INACTIVE,
      message: `You cannot use ${pluginName} because your ${licenseType} license has expired.`
    };
  }

  // License is valid and active
  return {
    isAvailable: true,
    status: LICENSE_STATUS.VALID,
  };
}
