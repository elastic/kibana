/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import {
  ElasticsearchError,
  LicenseType,
  ILicense,
  LicenseStatus,
  LICENSE_CHECK_STATE,
  LICENSE_TYPE,
  PublicLicense,
} from '../server/types';

/**
 * @public
 */
export class License implements ILicense {
  private readonly license?: PublicLicense['license'];
  private readonly features?: PublicLicense['features'];

  public error?: ElasticsearchError;
  public isActive: boolean;
  public isAvailable: boolean;
  public isBasic: boolean;
  public isNotBasic: boolean;

  public uid?: string;
  public status?: LicenseStatus;
  public expiryDateInMillis?: number;
  public type?: LicenseType;
  public signature: string;

  /**
   * @internal
   * Generate a License instance from json representation.
   */
  static fromJSON(json: PublicLicense) {
    return new License(json);
  }

  constructor({
    license,
    features,
    signature,
    error,
  }: PublicLicense & { error?: ElasticsearchError }) {
    this.isAvailable = Boolean(license);
    this.license = license;
    this.features = features;
    this.error = error;
    this.signature = signature;

    if (license) {
      this.uid = license.uid;
      this.status = license.status;
      this.expiryDateInMillis = license.expiryDateInMillis;
      this.type = license.type;
    }

    this.isActive = this.status === 'active';
    this.isBasic = this.isActive && this.type === 'basic';
    this.isNotBasic = this.isActive && this.type !== 'basic';
  }

  toJSON() {
    return {
      license: this.license,
      features: this.features,
      signature: this.signature,
    };
  }

  public getUnavailableReason() {
    if (this.error) {
      if (this.error.status === 400) {
        return 'X-Pack plugin is not installed on the Elasticsearch cluster.';
      }

      return this.error;
    }
    if (!this.isAvailable) {
      return 'Elasticsearch cluster did not respond with license information.';
    }
  }

  isOneOf(candidateLicenses: LicenseType | LicenseType[]) {
    if (!this.type) {
      return false;
    }

    if (!Array.isArray(candidateLicenses)) {
      candidateLicenses = [candidateLicenses];
    }

    return candidateLicenses.includes(this.type);
  }

  check(pluginName: string, minimumLicenseRequired: LicenseType) {
    if (!(minimumLicenseRequired in LICENSE_TYPE)) {
      throw new Error(`"${minimumLicenseRequired}" is not a valid license type`);
    }

    if (!this.isAvailable) {
      return {
        state: LICENSE_CHECK_STATE.Unavailable,
        message: i18n.translate('xpack.licensing.check.errorUnavailableMessage', {
          defaultMessage:
            'You cannot use {pluginName} because license information is not available at this time.',
          values: { pluginName },
        }),
      };
    }

    const type = this.type!;

    if (!this.isActive) {
      return {
        state: LICENSE_CHECK_STATE.Expired,
        message: i18n.translate('xpack.licensing.check.errorExpiredMessage', {
          defaultMessage:
            'You cannot use {pluginName} because your {licenseType} license has expired.',
          values: { licenseType: type, pluginName },
        }),
      };
    }

    if (LICENSE_TYPE[type] < LICENSE_TYPE[minimumLicenseRequired]) {
      return {
        state: LICENSE_CHECK_STATE.Invalid,
        message: i18n.translate('xpack.licensing.check.errorUnsupportedMessage', {
          defaultMessage:
            'Your {licenseType} license does not support {pluginName}. Please upgrade your license.',
          values: { licenseType: type, pluginName },
        }),
      };
    }

    return { state: LICENSE_CHECK_STATE.Valid };
  }

  getFeature(name: string) {
    if (this.isAvailable && this.features && this.features.hasOwnProperty(name)) {
      return { ...this.features[name] };
    }

    return {
      available: false,
      enabled: false,
    };
  }
}
