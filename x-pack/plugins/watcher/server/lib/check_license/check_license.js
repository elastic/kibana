/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function checkLicense(xpackLicenseInfo) {
  // If, for some reason, we cannot get the license information
  // from Elasticsearch, assume worst case and disable the Watcher UI
  if (!xpackLicenseInfo || !xpackLicenseInfo.isAvailable()) {
    return {
      isAvailable: false,
      showLinks: true,
      enableLinks: false,
      message: 'You cannot use Watcher because license information is not available at this time.'
    };
  }

  const VALID_LICENSE_MODES = [
    'trial',
    'standard',
    'gold',
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
      message: `Your ${licenseType} license does not support Watcher. Please upgrade your license.`
    };
  }

  // License is valid but not active
  if (!isLicenseActive) {
    return {
      isAvailable: false,
      showLinks: true,
      enableLinks: false,
      message: `You cannot use Watcher because your ${licenseType} license has expired.`
    };
  }

  // License is valid and active
  return {
    isAvailable: true,
    showLinks: true,
    enableLinks: true
  };
}