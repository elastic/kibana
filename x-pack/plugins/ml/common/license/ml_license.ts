/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable, Subscription } from 'rxjs';
import { ILicense } from '../../../licensing/common/types';
import { PLUGIN_ID } from '../constants/app';

export const MINIMUM_LICENSE = 'basic';
export const MINIMUM_FULL_LICENSE = 'platinum';

export interface LicenseStatus {
  isValid: boolean;
  isSecurityEnabled: boolean;
  message?: string;
}

export class MlLicense {
  private _licenseSubscription: Subscription | null = null;
  private _license: ILicense | null = null;
  private _isSecurityEnabled: boolean = false;
  private _hasLicenseExpired: boolean = false;
  private _isMlEnabled: boolean = false;
  private _isMinimumLicense: boolean = false;
  private _isFullLicense: boolean = false;
  private _initialized: boolean = false;

  public setup(
    license$: Observable<ILicense>,
    postInitFunctions?: Array<(lic: MlLicense) => void>
  ) {
    this._licenseSubscription = license$.subscribe(async (license) => {
      const { isEnabled: securityIsEnabled } = license.getFeature('security');

      this._license = license;
      this._isSecurityEnabled = securityIsEnabled;
      this._hasLicenseExpired = this._license.status === 'expired';
      this._isMlEnabled = this._license.getFeature(PLUGIN_ID).isEnabled;
      this._isMinimumLicense = isMinimumLicense(this._license);
      this._isFullLicense = isFullLicense(this._license);

      if (this._initialized === false && postInitFunctions !== undefined) {
        postInitFunctions.forEach((f) => f(this));
      }
      this._initialized = true;
    });
  }

  public unsubscribe() {
    if (this._licenseSubscription !== null) {
      this._licenseSubscription.unsubscribe();
    }
  }

  public isSecurityEnabled() {
    return this._isSecurityEnabled;
  }

  public hasLicenseExpired() {
    return this._hasLicenseExpired;
  }

  public isMlEnabled() {
    return this._isMlEnabled;
  }

  public isMinimumLicense() {
    return this._isMinimumLicense;
  }

  public isFullLicense() {
    return this._isFullLicense;
  }
}

export function isFullLicense(license: ILicense) {
  return license.check(PLUGIN_ID, MINIMUM_FULL_LICENSE).state === 'valid';
}

export function isMinimumLicense(license: ILicense) {
  return license.check(PLUGIN_ID, MINIMUM_LICENSE).state === 'valid';
}

export function isMlEnabled(license: ILicense) {
  return license.getFeature(PLUGIN_ID).isEnabled;
}
