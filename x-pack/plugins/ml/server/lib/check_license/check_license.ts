/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import {
  LICENSE_TYPE,
  VALID_FULL_LICENSE_MODES,
} from '../../../../../legacy/plugins/ml/common/constants/license';
import { LicenseCheckResult } from '../../types';

interface Response {
  isAvailable: boolean;
  showLinks: boolean;
  enableLinks: boolean;
  licenseType?: LICENSE_TYPE;
  hasExpired?: boolean;
  message?: string;
}

export function checkLicense(licenseCheckResult: LicenseCheckResult): Response {
  // If, for some reason, we cannot get the license information
  // from Elasticsearch, assume worst case and disable the Machine Learning UI
  if (licenseCheckResult === undefined || !licenseCheckResult.isAvailable) {
    return {
      isAvailable: false,
      showLinks: true,
      enableLinks: false,
      message: i18n.translate(
        'xpack.ml.checkLicense.licenseInformationNotAvailableThisTimeMessage',
        {
          defaultMessage:
            'You cannot use Machine Learning because license information is not available at this time.',
        }
      ),
    };
  }

  const featureEnabled = licenseCheckResult.isEnabled;
  if (!featureEnabled) {
    return {
      isAvailable: false,
      showLinks: false,
      enableLinks: false,
      message: i18n.translate('xpack.ml.checkLicense.mlIsUnavailableMessage', {
        defaultMessage: 'Machine Learning is unavailable',
      }),
    };
  }

  const isLicenseModeValid =
    licenseCheckResult.type && VALID_FULL_LICENSE_MODES.includes(licenseCheckResult.type);
  const licenseType = isLicenseModeValid === true ? LICENSE_TYPE.FULL : LICENSE_TYPE.BASIC;
  const isLicenseActive = licenseCheckResult.isActive;
  const licenseTypeName = licenseCheckResult.type;

  // Platinum or trial license is valid but not active, i.e. expired
  if (licenseType === LICENSE_TYPE.FULL && isLicenseActive === false) {
    return {
      isAvailable: true,
      showLinks: true,
      enableLinks: true,
      hasExpired: true,
      licenseType,
      message: i18n.translate('xpack.ml.checkLicense.licenseHasExpiredMessage', {
        defaultMessage: 'Your {licenseTypeName} Machine Learning license has expired.',
        values: { licenseTypeName },
      }),
    };
  }

  // License is valid and active
  return {
    isAvailable: true,
    showLinks: true,
    enableLinks: true,
    licenseType,
    hasExpired: false,
  };
}
