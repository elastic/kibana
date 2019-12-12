/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export enum LICENSE_CHECK_STATE {
  Unavailable = 'UNAVAILABLE',
  Invalid = 'INVALID',
  Expired = 'EXPIRED',
  Valid = 'VALID',
}

export enum LICENSE_TYPE {
  basic = 10,
  standard = 20,
  gold = 30,
  platinum = 40,
  trial = 50,
}

/** @public */
export type LicenseType = keyof typeof LICENSE_TYPE;

/** @public */
export type LicenseStatus = 'active' | 'invalid' | 'expired';

/** @public */
export interface LicenseFeature {
  isAvailable: boolean;
  isEnabled: boolean;
}

/**
 * Subset of license data considered as non-sensitive information.
 * Can be passed to the client.
 * @public
 * */
export interface PublicLicense {
  /**
   * UID for license.
   */
  uid: string;

  /**
   * The validity status of the license.
   */
  status: LicenseStatus;

  /**
   * Unix epoch of the expiration date of the license.
   */
  expiryDateInMillis: number;

  /**
   * The license type, being usually one of basic, standard, gold, platinum, or trial.
   */
  type: LicenseType;
  /**
   * The license type, being usually one of basic, standard, gold, platinum, or trial.
   * @deprecated use 'type' instead
   */
  mode: LicenseType;
}

/**
 * Provides information about feature availability for the current license.
 * @public
 * */
export type PublicFeatures = Record<string, LicenseFeature>;

/**
 * Subset of license & features data considered as non-sensitive information.
 * Structured as json to be passed to the client.
 * @public
 * */
export interface PublicLicenseJSON {
  license?: PublicLicense;
  features?: PublicFeatures;
  signature: string;
}

/**
 * @public
 * Results from checking if a particular license type meets the minimum
 * requirements of the license type.
 */
export interface LicenseCheck {
  /**
   * The state of checking the results of a license type meeting the license minimum.
   */
  state: LICENSE_CHECK_STATE;
  /**
   * A message containing the reason for a license type not being valid.
   */
  message?: string;
}

/** @public */
export interface ILicense {
  /**
   * UID for license.
   */
  uid?: string;

  /**
   * The validity status of the license.
   */
  status?: LicenseStatus;

  /**
   * Determine if the status of the license is active.
   */
  isActive: boolean;

  /**
   * Unix epoch of the expiration date of the license.
   */
  expiryDateInMillis?: number;

  /**
   * The license type, being usually one of basic, standard, gold, platinum, or trial.
   */
  type?: LicenseType;

  /**
   * The license type, being usually one of basic, standard, gold, platinum, or trial.
   * @deprecated use 'type' instead.
   */
  mode?: LicenseType;

  /**
   * Signature of the license content.
   */
  signature: string;

  /**
   * Determine if the license container has information.
   */
  isAvailable: boolean;

  /**
   * Determine if the type of the license is basic, and also active.
   */
  isBasic: boolean;

  /**
   * Determine if the type of the license is not basic, and also active.
   */
  isNotBasic: boolean;

  /**
   * Returns
   */
  toJSON: () => PublicLicenseJSON;

  /**
   * A potential error denoting the failure of the license from being retrieved.
   */
  error?: string;

  /**
   * If the license is not available, provides a string or Error containing the reason.
   */
  getUnavailableReason: () => string | undefined;

  /**
   * Determine if the provided license types match against the license type.
   * @param candidateLicenses license types to intersect against the license.
   */
  isOneOf(candidateLicenses: LicenseType | LicenseType[]): boolean;

  /**
   * For a given plugin and license type, receive information about the status of the license.
   * @param pluginName the name of the plugin
   * @param minimumLicenseRequired the minimum valid license for operating the given plugin
   */
  check(pluginName: string, minimumLicenseRequired: LicenseType): LicenseCheck;

  /**
   * A specific API for interacting with the specific features of the license.
   * @param name the name of the feature to interact with
   */
  getFeature(name: string): LicenseFeature;
}
