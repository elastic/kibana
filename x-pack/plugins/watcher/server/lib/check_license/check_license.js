/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export function checkLicense(xpackLicenseInfo) {
  // If, for some reason, we cannot get the license information
  // from Elasticsearch, assume worst case and disable the Watcher UI
  if (!xpackLicenseInfo || !xpackLicenseInfo.isAvailable()) {
    return {
      isAvailable: false,
      showLinks: true,
      enableLinks: false,
      message: i18n.translate('xpack.watcher.checkLicense.licenseInformationNotAvailableTextMessage', {
        defaultMessage: 'You cannot use {watcher} because license information is not available at this time.',
        values: {
          watcher: 'Watcher'
        }
      }),
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
      message: i18n.translate('xpack.watcher.checkLicense.licenseDoesNotSupportTextMessage', {
        defaultMessage: 'Your {licenseType} license does not support {watcher}. Please upgrade your license.',
        values: {
          licenseType,
          watcher: 'Watcher'
        },
      }),
    };
  }

  // License is valid but not active
  if (!isLicenseActive) {
    return {
      isAvailable: false,
      showLinks: true,
      enableLinks: false,
      message: i18n.translate('xpack.watcher.server.checkLicense.licenseExpiredTextMessage', {
        defaultMessage: 'You cannot use {watcher} because your {licenseType} license has expired',
        values: {
          licenseType,
          watcher: 'Watcher'
        },
      }),
    };
  }

  // License is valid and active
  return {
    isAvailable: true,
    showLinks: true,
    enableLinks: true
  };
}