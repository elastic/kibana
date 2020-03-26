/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import {
  LicenseType,
  ILicense,
  LicenseStatus,
  LICENSE_CHECK_STATE,
  LICENSE_TYPE,
  PublicLicenseJSON,
  PublicLicense,
  PublicFeatures,
} from './types';

/**
 * @public
 */
export class License implements ILicense {
  private readonly license?: PublicLicense;
  private readonly features?: PublicFeatures;

  public readonly error?: string;
  public readonly isActive: boolean;
  public readonly isAvailable: boolean;

  public readonly uid?: string;
  public readonly status?: LicenseStatus;
  public readonly expiryDateInMillis?: number;
  public readonly type?: LicenseType;
  public readonly mode?: LicenseType;
  public readonly signature: string;

  /**
   * @internal
   * Generate a License instance from json representation.
   */
  static fromJSON(json: PublicLicenseJSON) {
    return new License(json);
  }

  constructor({
    license,
    features,
    error,
    signature,
  }: {
    license?: PublicLicense;
    features?: PublicFeatures;
    error?: string;
    signature: string;
  }) {
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
      this.mode = license.mode;
    }

    this.isActive = this.status === 'active';
  }

  toJSON() {
    return {
      license: this.license,
      features: this.features,
      signature: this.signature,
    };
  }

  getUnavailableReason() {
    if (this.error) return this.error;
    if (!this.isAvailable) {
      return 'X-Pack plugin is not installed on the Elasticsearch cluster.';
    }
  }

  hasAtLeast(minimumLicenseRequired: LicenseType) {
    const type = this.type;
    if (!type) {
      return false;
    }

    if (!(minimumLicenseRequired in LICENSE_TYPE)) {
      throw new Error(`"${minimumLicenseRequired}" is not a valid license type`);
    }

    return LICENSE_TYPE[minimumLicenseRequired] <= LICENSE_TYPE[type];
  }

  check(pluginName: string, minimumLicenseRequired: LicenseType) {
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

    if (!this.isActive) {
      return {
        state: LICENSE_CHECK_STATE.Expired,
        message: i18n.translate('xpack.licensing.check.errorExpiredMessage', {
          defaultMessage:
            'You cannot use {pluginName} because your {licenseType} license has expired.',
          values: { licenseType: this.type!, pluginName },
        }),
      };
    }

    if (!this.hasAtLeast(minimumLicenseRequired)) {
      return {
        state: LICENSE_CHECK_STATE.Invalid,
        message: i18n.translate('xpack.licensing.check.errorUnsupportedMessage', {
          defaultMessage:
            'Your {licenseType} license does not support {pluginName}. Please upgrade your license.',
          values: { licenseType: this.type!, pluginName },
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
      isAvailable: false,
      isEnabled: false,
    };
  }
}
