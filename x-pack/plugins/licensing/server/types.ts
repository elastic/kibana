/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { TypeOf } from '@kbn/config-schema';
import { schema } from './schema';
import { LICENSE_TYPE, LICENSE_STATUS } from './constants';
import { LicenseFeature } from './license_feature';

/**
 * @public
 * Results from checking if a particular license type meets the minimum
 * requirements of the license type.
 */
export interface ILicenseCheck {
  /**
   * The status of checking the results of a license type meeting the license minimum.
   */
  check: LICENSE_STATUS;
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
  status?: string;

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
  type?: string;

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
   * If the license is not available, provides a string or Error containing the reason.
   */
  reasonUnavailable: string | Error | null;

  /**
   * The MD5 hash of the serialized license.
   */
  signature: string;

  /**
   * Determine if the provided license types match against the license type.
   * @param candidateLicenses license types to intersect against the license.
   */
  isOneOf(candidateLicenses: string | string[]): boolean;

  /**
   * Determine if the provided license type is sufficient for the current license.
   * @param minimum a license type to determine for sufficiency
   */
  meetsMinimumOf(minimum: LICENSE_TYPE): boolean;

  /**
   * For a given plugin and license type, receive information about the status of the license.
   * @param pluginName the name of the plugin
   * @param minimumLicenseRequired the minimum valid license for operating the given plugin
   */
  check(pluginName: string, minimumLicenseRequired: LICENSE_TYPE | string): ILicenseCheck;

  /**
   * Receive a serialized plain object of the license.
   */
  toObject(): any;

  /**
   * A specific API for interacting with the specific features of the license.
   * @param name the name of the feature to interact with
   */
  getFeature(name: string): LicenseFeature | undefined;
}

/** @public */
export interface LicensingPluginSetup {
  license$: Observable<ILicense>;
}
/** @public */
export type LicensingConfigType = TypeOf<typeof schema>;
/** @public */
export type LicenseType = keyof typeof LICENSE_TYPE;
/** @public */
export type LicenseFeatureSerializer = (licensing: ILicense) => any;
