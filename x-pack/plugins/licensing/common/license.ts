/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { LicenseFeature } from './license_feature';
import { LICENSE_CHECK_STATE, LICENSE_TYPE } from './constants';
import { LicenseType, ILicense, IObjectifiedLicense, IRawLicense, IRawFeatures } from './types';

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
  sign(serialized: string): string;
  license?: IRawLicense;
  features?: IRawFeatures;
  error?: Error;
  clusterSource?: string;
}

/**
 * @public
 */
export class License implements ILicense {
  /**
   * A function to generate the signature for a serialized license.
   */
  private readonly sign: (serialized: string) => string;

  /**
   * Determine if the license is defined/contains data.
   */
  private readonly hasLicense: boolean;

  /**
   * The raw license information.
   */
  private readonly license: IRawLicense;

  /**
   * The raw feature information.
   */
  private readonly features: IRawFeatures;

  /**
   * A cached copy of the serialized and signed license.
   */
  private _signature!: string;

  /**
   * A cached copy of the objectified license.
   */
  private objectified!: any;

  /**
   * Mapping of feature names to feature information.
   */
  private readonly featuresMap: Map<string, LicenseFeature>;

  /**
   * Optional cluster source for providing supplemental informational reasons. Server-only.
   */
  private clusterSource?: string;

  /**
   * A potential error denoting the failure of the license from being retrieved.
   */
  public error?: Error;

  /**
   * Generate a License instance from a previously-objectified license.
   * @param objectified An objectified license instance, typically generated from a license's toObject() method.
   * @param licenseArgs Additional properties to specify for the creation of a License instance.
   */
  static fromObjectified(
    objectified: IObjectifiedLicense,
    { sign, error, clusterSource }: LicenseArgs
  ) {
    const license = {
      uid: objectified.license.uid,
      status: objectified.license.status,
      type: objectified.license.type,
      expiry_date_in_millis: objectified.license.expiryDateInMillis,
    };
    const features = objectified.features.reduce(
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
      sign,
      error,
      clusterSource,
      license,
      features,
    });
  }

  constructor({ sign, license, features, error, clusterSource }: LicenseArgs) {
    this.sign = sign;
    this.hasLicense = Boolean(license);
    this.license = license || {};
    this.features = features || {};
    this.featuresMap = new Map<string, LicenseFeature>();
    this.error = error;
    this.clusterSource = clusterSource;
  }

  /**
   * UID for license.
   */
  public get uid() {
    return this.license.uid;
  }

  /**
   * The validity status of the license.
   */
  public get status() {
    return this.license.status;
  }

  /**
   * Determine if the status of the license is active.
   */
  public get isActive() {
    return this.status === 'active';
  }

  /**
   * Unix epoch of the expiration date of the license.
   */
  public get expiryDateInMillis() {
    return this.license.expiry_date_in_millis;
  }

  /**
   * The license type, being usually one of basic, standard, gold, platinum, or trial.
   */
  public get type() {
    return this.license.type;
  }

  /**
   * Determine if the license container has information.
   */
  public get isAvailable() {
    return this.hasLicense;
  }

  /**
   * Determine if the type of the license is basic, and also active.
   */
  public get isBasic() {
    return this.isActive && this.type === 'basic';
  }

  /**
   * Determine if the type of the license is not basic, and also active.
   */
  public get isNotBasic() {
    return this.isActive && this.type !== 'basic';
  }

  /**
   * If the license is not available, provides a string or Error containing the reason.
   */
  public get reasonUnavailable() {
    if (!this.isAvailable) {
      return `[${this.clusterSource}] Elasticsearch cluster did not respond with license information.`;
    }

    if (this.error instanceof Error && (this.error as any).status === 400) {
      return `X-Pack plugin is not installed on the [${this.clusterSource}] Elasticsearch cluster.`;
    }

    return this.error;
  }

  /**
   * A hash or stringified version of the serialized license.
   */
  public get signature() {
    if (this._signature) {
      return this._signature;
    }

    this._signature = this.sign(JSON.stringify(this.toObject()));

    return this._signature;
  }

  /**
   * Determine if the provided license types match against the license type.
   * @param candidateLicenses license types to intersect against the license.
   */
  isOneOf(candidateLicenses: string | string[]) {
    if (!Array.isArray(candidateLicenses)) {
      candidateLicenses = [candidateLicenses];
    }

    if (!this.type) {
      return false;
    }

    return candidateLicenses.includes(this.type);
  }

  /**
   * Determine if the provided license type is sufficient for the current license.
   * @param minimum a license type to determine for sufficiency
   */
  meetsMinimumOf(minimum: LICENSE_TYPE) {
    return LICENSE_TYPE[this.type as LicenseType] >= minimum;
  }

  /**
   * For a given plugin and license type, receive information about the status of the license.
   * @param pluginName the name of the plugin
   * @param minimumLicenseRequired the minimum valid license for operating the given plugin
   */
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

  /**
   * Receive a serialized plain object of the license.
   */
  toObject(): IObjectifiedLicense {
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

  /**
   * A specific API for interacting with the specific features of the license.
   * @param name the name of the feature to interact with
   */
  getFeature(name: string) {
    let feature = this.featuresMap.get(name);

    if (!feature) {
      feature = new LicenseFeature(name, this.features[name]);
      this.featuresMap.set(name, feature);
    }

    return feature;
  }
}
