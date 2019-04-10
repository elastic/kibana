/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

export const LICENSE_TYPE_BASIC = 'basic';
export const LICENSE_TYPE_STANDARD = 'standard';
export const LICENSE_TYPE_GOLD = 'gold';
export const LICENSE_TYPE_PLATINUM = 'platinum';
export const LICENSE_TYPE_TRIAL = 'trial';

export const LICENSE_STATUS_UNAVAILABLE = 'UNAVAILABLE';
export const LICENSE_STATUS_INVALID = 'INVALID';
export const LICENSE_STATUS_EXPIRED = 'EXPIRED';
export const LICENSE_STATUS_VALID = 'VALID';

// These are ordered from least featureful to most featureful, so we can assume that someone holding
// a license at a particular index cannot access any features unlocked by the licenses that follow it.
const RANKED_LICENSE_TYPES = [
  LICENSE_TYPE_BASIC,
  LICENSE_TYPE_STANDARD,
  LICENSE_TYPE_GOLD,
  LICENSE_TYPE_PLATINUM,
  LICENSE_TYPE_TRIAL,
];

const FEATURE = {
  ID: 'audit_logging'
};

export class AuditLogger {
  constructor(server, pluginId, config, xPackInfo) {
    this._server = server;
    this._pluginId = pluginId;
    this._enabled = config.get('xpack.security.enabled') && config.get('xpack.security.audit.enabled');
    this._licensed = false;
    this._checkLicense = (xPackInfo) => {
      this._licensed = checkLicense(FEATURE.ID, LICENSE_TYPE_STANDARD, xPackInfo).status === LICENSE_STATUS_VALID;
    };
    xPackInfo.feature(`${FEATURE.ID}-${pluginId}`).registerLicenseCheckResultsGenerator(this._checkLicense);
    this._checkLicense(xPackInfo);
  }

  log(eventType, message, data = {}) {
    if(!this._licensed || !this._enabled) {
      return;
    }

    this._server.logWithMetadata(['info', 'audit', this._pluginId, eventType], message, {
      ...data,
      eventType,
    });
  }
}

function checkLicense(pluginName, minimumLicenseRequired, xpackLicenseInfo) {
  if(!RANKED_LICENSE_TYPES.includes(minimumLicenseRequired)) {
    throw new Error(`Invalid license type supplied to checkLicense: ${minimumLicenseRequired}`);
  }

  // If, for some reason, we cannot get the license information
  // from Elasticsearch, assume worst case and disable
  if (!xpackLicenseInfo || !xpackLicenseInfo.isAvailable()) {
    return {
      status: LICENSE_STATUS_UNAVAILABLE,
      message: i18n.translate(
        'xpack.server.checkLicense.errorUnavailableMessage',
        {
          defaultMessage: 'You cannot use {pluginName} because license information is not available at this time.',
          values: { pluginName },
        },
      ),
    };
  }

  const { license } = xpackLicenseInfo;
  const isLicenseModeValid = license.isOneOf([...RANKED_LICENSE_TYPES].splice(RANKED_LICENSE_TYPES.indexOf(minimumLicenseRequired)));
  const isLicenseActive = license.isActive();
  const licenseType = license.getType();

  // License is not valid
  if (!isLicenseModeValid) {
    return {
      status: LICENSE_STATUS_INVALID,
      message: i18n.translate(
        'xpack.server.checkLicense.errorUnsupportedMessage',
        {
          defaultMessage: 'Your {licenseType} license does not support {pluginName}. Please upgrade your license.',
          values: { licenseType, pluginName },
        },
      ),
    };
  }

  // License is valid but not active
  if (!isLicenseActive) {
    return {
      status: LICENSE_STATUS_EXPIRED,
      message: i18n.translate(
        'xpack.server.checkLicense.errorExpiredMessage',
        {
          defaultMessage: 'You cannot use {pluginName} because your {licenseType} license has expired',
          values: { licenseType, pluginName },
        },
      ),
    };
  }

  // License is valid and active
  return {
    status: LICENSE_STATUS_VALID,
  };
}
