/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



export function checkLicense(xpackLicenseInfo) {
  // If, for some reason, we cannot get the license information
  // from Elasticsearch, assume worst case and disable the Machine Learning UI
  if (!xpackLicenseInfo || !xpackLicenseInfo.isAvailable()) {
    return {
      isAvailable: false,
      showLinks: true,
      enableLinks: false,
      message: 'You cannot use Machine Learning because license information is not available at this time.'
    };
  }

  const featureEnabled = xpackLicenseInfo.feature('ml').isEnabled();
  if (!featureEnabled) {
    return {
      isAvailable: false,
      showLinks: false,
      enableLinks: false,
      message: 'Machine Learning is unavailable'
    };
  }

  const VALID_LICENSE_MODES = [
    'trial',
    'platinum'
  ];

  const isLicenseModeValid = xpackLicenseInfo.license.isOneOf(VALID_LICENSE_MODES);
  const isLicenseActive = xpackLicenseInfo.license.isActive();
  const licenseType = xpackLicenseInfo.license.getType();

  // License is not valid
  if (!isLicenseModeValid) {
    return {
      isAvailable: false,
      showLinks: false,
      enableLinks: false,
      message: `Your ${licenseType} license does not support Machine Learning. Please upgrade your license.`
    };
  }

  // License is valid but not active
  if (!isLicenseActive) {
    return {
      isAvailable: true,
      showLinks: true,
      enableLinks: true,
      hasExpired: true,
      message: `Your ${licenseType} Machine Learning license has expired.`
    };
  }

  // License is valid and active
  return {
    isAvailable: true,
    showLinks: true,
    enableLinks: true,
    hasExpired: false,
  };
}
