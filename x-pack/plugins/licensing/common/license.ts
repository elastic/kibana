/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { LicenseFeature } from './license_feature';
import { LICENSE_CHECK_STATE, LICENSE_TYPE } from './constants';
import {
  LicenseType,
  ILicense,
  ILicensingPlugin,
  ObjectifiedLicense,
  RawLicense,
  RawFeatures,
} from './types';

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

/*
  uid?: string;
  status?: string;
  expiry_date_in_millis?: number;
  type?: LicenseType;
}

export interface RawFeatures {
  [key: string]: {
    available: boolean;
    enabled: boolean;
  };
}

export interface ObjectifiedLicense {
  license: {
    type: LicenseType;
    isActive: boolean;
    expiryDateInMillis: number;
  };
  features: any[];
*/

export class License implements ILicense {
  private readonly plugin: ILicensingPlugin;
  private readonly hasLicense: boolean;
  private readonly license: RawLicense;
  private readonly features: RawFeatures;
  private _signature!: string;
  private objectified!: any;
  private readonly featuresMap: Map<string, LicenseFeature>;
  private clusterSource?: string;
  public error?: Error;

  static fromObjectified(
    objectified: ObjectifiedLicense,
    { plugin, error, clusterSource }: LicenseArgs
  ) {
    const license = objectified.license && {
      uid: objectified.license.uid,
      status: objectified.license.status,
      type: objectified.license.type,
      expiry_date_in_millis: objectified.license.expiryDateInMillis,
    };
    const features =
      objectified.features &&
      objectified.features.reduce(
        (map, feature) => ({
          ...map,
          [feature.name]: {
            available: feature.isAvailable,
            enabled: feature.isEnabled,
          },
        }),
        {}
      );

    return new License({
      plugin,
      error,
      clusterSource,
      license,
      features,
    });
  }

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
        state: LICENSE_CHECK_STATE.Unavailable,
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
        state: LICENSE_CHECK_STATE.Invalid,
        message: i18n.translate('xpack.licensing.check.errorUnsupportedMessage', {
          defaultMessage:
            'Your {licenseType} license does not support {pluginName}. Please upgrade your license.',
          values: { licenseType, pluginName },
        }),
      };
    }

    if (!this.isActive) {
      return {
        state: LICENSE_CHECK_STATE.Expired,
        message: i18n.translate('xpack.licensing.check.errorExpiredMessage', {
          defaultMessage:
            'You cannot use {pluginName} because your {licenseType} license has expired.',
          values: { licenseType, pluginName },
        }),
      };
    }

    return { state: LICENSE_CHECK_STATE.Valid };
  }

  toObject() {
    if (this.objectified) {
      return this.objectified;
    }

    this.objectified = {
      license: {
        type: this.type,
        status: this.status,
        uid: this.uid,
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
      feature = new LicenseFeature(name, this.features[name]);
      this.featuresMap.set(name, feature);
    }

    return feature;
  }
}
