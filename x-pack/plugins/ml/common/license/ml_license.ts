/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable, Subscription } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import type { ILicense } from '@kbn/licensing-plugin/common/types';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { isEqual } from 'lodash';
import { PLUGIN_ID } from '../constants/app';

export const MINIMUM_LICENSE = 'basic';
export const MINIMUM_FULL_LICENSE = 'platinum';
export const TRIAL_LICENSE = 'trial';

export interface LicenseStatus {
  isValid: boolean;
  isSecurityEnabled: boolean;
  message?: string;
}

export interface MlLicenseInfo {
  license: ILicense | null;
  isSecurityEnabled: boolean;
  hasLicenseExpired: boolean;
  isMlEnabled: boolean;
  isMinimumLicense: boolean;
  isFullLicense: boolean;
  isTrialLicense: boolean;
}

export class MlLicense {
  private _licenseSubscription: Subscription | null = null;
  private _license: ILicense | null = null;
  private _isSecurityEnabled: boolean = false;
  private _hasLicenseExpired: boolean = false;
  private _isMlEnabled: boolean = false;
  private _isMinimumLicense: boolean = false;
  private _isFullLicense: boolean = false;
  private _isTrialLicense: boolean = false;

  private _licenseInfo$ = new BehaviorSubject<MlLicenseInfo>({
    license: this._license,
    isSecurityEnabled: this._isSecurityEnabled,
    hasLicenseExpired: this._hasLicenseExpired,
    isMlEnabled: this._isMlEnabled,
    isMinimumLicense: this._isMinimumLicense,
    isFullLicense: this._isFullLicense,
    isTrialLicense: this._isTrialLicense,
  });

  public licenseInfo$: Observable<MlLicenseInfo> = this._licenseInfo$.pipe(
    distinctUntilChanged(isEqual)
  );

  public isLicenseReady$: Observable<boolean> = this._licenseInfo$.pipe(
    map((v) => !!v.license),
    distinctUntilChanged()
  );

  public setup(license$: Observable<ILicense>, callback?: (lic: MlLicense) => void) {
    this._licenseSubscription = license$.subscribe((license) => {
      const { isEnabled: securityIsEnabled } = license.getFeature('security');

      const mlLicenseUpdate = {
        license,
        isSecurityEnabled: securityIsEnabled,
        hasLicenseExpired: license.status === 'expired',
        isMlEnabled: license.getFeature(PLUGIN_ID).isEnabled,
        isMinimumLicense: isMinimumLicense(license),
        isFullLicense: isFullLicense(license),
        isTrialLicense: isTrialLicense(license),
      };

      this._licenseInfo$.next(mlLicenseUpdate);

      this._license = license;
      this._isSecurityEnabled = mlLicenseUpdate.isSecurityEnabled;
      this._hasLicenseExpired = mlLicenseUpdate.hasLicenseExpired;
      this._isMlEnabled = mlLicenseUpdate.isMlEnabled;
      this._isMinimumLicense = mlLicenseUpdate.isMinimumLicense;
      this._isFullLicense = mlLicenseUpdate.isFullLicense;
      this._isTrialLicense = mlLicenseUpdate.isTrialLicense;

      if (callback !== undefined) {
        callback(this);
      }
    });
  }

  public getLicenseInfo() {
    return this._licenseInfo$.getValue();
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

  public isTrialLicense() {
    return this._isTrialLicense;
  }
}

export function isFullLicense(license: ILicense) {
  return license.check(PLUGIN_ID, MINIMUM_FULL_LICENSE).state === 'valid';
}

export function isTrialLicense(license: ILicense) {
  return license.check(PLUGIN_ID, TRIAL_LICENSE).state === 'valid';
}

export function isMinimumLicense(license: ILicense) {
  return license.check(PLUGIN_ID, MINIMUM_LICENSE).state === 'valid';
}

export function isMlEnabled(license: ILicense) {
  return license.getFeature(PLUGIN_ID).isEnabled;
}
