/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject } from 'rxjs';
import { TypeOf } from '@kbn/config-schema';
import { schema } from './schema';
import { LICENSE_TYPE, LICENSE_STATUS } from './constants';
import { LicenseFeature } from './license_feature';

/** @public */
export interface ILicensingCheck {
  check: LICENSE_STATUS;
  message?: string;
}
/** @public */
export interface ILicensingPluginSetup {
  uid?: string;
  status?: string;
  isActive: boolean;
  expiryDateInMillis?: number;
  type?: string;
  isAvailable: boolean;
  isBasic: boolean;
  isNotBasic: boolean;
  reasonUnavailable: string | Error | null;
  signature: string;
  isOneOf(candidateLicenses: string | string[]): boolean;
  meetsMinimumOf(minimum: LICENSE_TYPE): boolean;
  check(pluginName: string, minimumLicenseRequired: LICENSE_TYPE | string): ILicensingCheck;
  toObject(): any;
  getFeature(name: string): LicenseFeature | undefined;
}
/** @public */
export type LicensingPluginSubject = BehaviorSubject<ILicensingPluginSetup>;
/** @public */
export type LicensingConfigType = TypeOf<typeof schema>;
/** @public */
export type LicenseType = keyof typeof LICENSE_TYPE;
/** @public */
export type LicenseFeatureSerializer = (licensing: ILicensingPluginSetup) => any;
