/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { LicenseFeature } from './license_feature';
import { LICENSE_STATUS, LICENSE_TYPE } from './constants';
import { LicenseType, ILicense, ILicensingPlugin, RawLicense, RawFeatures } from './types';

function toLicenseType(minimumLicenseRequired: LICENSE_TYPE | string) {
  if (typeof minimumLicenseRequired !== 'string') {
    return minimumLicenseRequired;
  }

  if (!(minimumLicenseRequired in LICENSE_TYPE)) {
    throw new Error(`${minimumLicenseRequired} is not a valid license type`);
  }

  return LICENSE_TYPE[minimumLicenseRequired as LicenseType];
}

interface LicenseArgs {
  plugin: ILicensingPlugin;
  license?: RawLicense;
  features?: RawFeatures;
  error?: Error;
  clusterSource?: string;
}

export class License implements ILicense {
  private readonly plugin: ILicensingPlugin;
  private readonly hasLicense: boolean;
  private readonly license: RawLicense;
  private readonly features: RawFeatures;
  private _signature!: string;
  private objectified!: any;
  private readonly featuresMap: Map<string, LicenseFeature>;
  private error?: Error;
  private clusterSource?: string;

  constructor({ plugin, license, features, error, clusterSource }: LicenseArgs) {
    this.plugin = plugin;
    this.hasLicense = Boolean(license);
    this.license = license || {};
    this.features = features || {};
    this.featuresMap = new Map<string, LicenseFeature>();
    this.error = error;
    this.clusterSource = clusterSource;
  }

  public get uid() {
    return this.license.uid;
  }

  public get status() {
    return this.license.status;
  }

  public get isActive() {
    return this.status === 'active';
  }

  public get expiryDateInMillis() {
    return this.license.expiry_date_in_millis;
  }

  public get type() {
    return this.license.type;
  }

  public get isAvailable() {
    return this.hasLicense;
  }

  public get isBasic() {
    return this.isActive && this.type === 'basic';
  }

  public get isNotBasic() {
    return this.isActive && this.type !== 'basic';
  }

  public get reasonUnavailable() {
    if (!this.isAvailable) {
      return `[${this.clusterSource}] Elasticsearch cluster did not respond with license information.`;
    }

    if (this.error instanceof Error && (this.error as any).status === 400) {
      return `X-Pack plugin is not installed on the [${this.clusterSource}] Elasticsearch cluster.`;
    }

    return this.error;
  }

  public get signature() {
    if (this._signature !== undefined) {
      return this._signature;
    }

    if (!this.plugin.sign) {
      return '';
    }

    this._signature = this.plugin.sign(JSON.stringify(this.toObject()));

    return this._signature;
  }

  isOneOf(candidateLicenses: string | string[]) {
    if (!Array.isArray(candidateLicenses)) {
      candidateLicenses = [candidateLicenses];
    }

    if (!this.type) {
      return false;
    }

    return candidateLicenses.includes(this.type);
  }

  meetsMinimumOf(minimum: LICENSE_TYPE) {
    return LICENSE_TYPE[this.type as LicenseType] >= minimum;
  }

  check(pluginName: string, minimumLicenseRequired: LICENSE_TYPE | string) {
    const minimum = toLicenseType(minimumLicenseRequired);

    if (!this.isAvailable) {
      return {
        check: LICENSE_STATUS.Unavailable,
        message: i18n.translate('xpack.licensing.check.errorUnavailableMessage', {
          defaultMessage:
            'You cannot use {pluginName} because license information is not available at this time.',
          values: { pluginName },
        }),
      };
    }

    const { type: licenseType } = this.license;

    if (!this.meetsMinimumOf(minimum)) {
      return {
        check: LICENSE_STATUS.Invalid,
        message: i18n.translate('xpack.licensing.check.errorUnsupportedMessage', {
          defaultMessage:
            'Your {licenseType} license does not support {pluginName}. Please upgrade your license.',
          values: { licenseType, pluginName },
        }),
      };
    }

    if (!this.isActive) {
      return {
        check: LICENSE_STATUS.Expired,
        message: i18n.translate('xpack.licensing.check.errorExpiredMessage', {
          defaultMessage:
            'You cannot use {pluginName} because your {licenseType} license has expired.',
          values: { licenseType, pluginName },
        }),
      };
    }

    return { check: LICENSE_STATUS.Valid };
  }

  toObject() {
    if (this.objectified) {
      return this.objectified;
    }

    this.objectified = {
      license: {
        type: this.type,
        isActive: this.isActive,
        expiryDateInMillis: this.expiryDateInMillis,
      },
      features: [...this.featuresMap].map(([, feature]) => feature.toObject()),
    };

    return this.objectified;
  }

  getFeature(name: string) {
    let feature = this.featuresMap.get(name);

    if (!feature) {
      feature = new LicenseFeature(name, this.features[name], this);
      this.featuresMap.set(name, feature);
    }

    return feature;
  }
}
