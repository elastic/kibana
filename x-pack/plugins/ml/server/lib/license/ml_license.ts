/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LicensingPluginSetup, ILicense, LICENSE_CHECK_STATE } from '../../../../licensing/server';
import { PLUGIN_ID } from '../../../../../legacy/plugins/ml/common/constants/app';

const MINIMUM_LICENSE = 'basic';
const MINIMUM_FULL_LICENSE = 'platinum';

export interface LicenseStatus {
  isValid: boolean;
  isSecurityEnabled: boolean;
  message?: string;
}

export class MlLicense {
  private _license: ILicense | null = null;
  private _isSecurityEnabled: boolean = false;
  private _hasLicenseExpired: boolean = false;
  private _isMlEnabled: boolean = false;
  private _isReducedLicense: boolean = false;
  private _isFullLicense: boolean = false;
  private _initialized: boolean = false;

  public setup(
    licensing: LicensingPluginSetup,
    postInitFunctions?: Array<(lic: MlLicense) => void>
  ) {
    licensing.license$.subscribe(async license => {
      const { isEnabled: securityIsEnabled } = license.getFeature('security');

      this._license = license;
      this._isSecurityEnabled = securityIsEnabled;
      this._hasLicenseExpired = this._license.status === 'expired';
      this._isMlEnabled = this._license.getFeature(PLUGIN_ID).isEnabled;
      this._isReducedLicense =
        this._license.check(PLUGIN_ID, MINIMUM_LICENSE).state === LICENSE_CHECK_STATE.Valid;
      this._isFullLicense =
        this._license.check(PLUGIN_ID, MINIMUM_FULL_LICENSE).state === LICENSE_CHECK_STATE.Valid;

      if (this._initialized === false && postInitFunctions !== undefined) {
        postInitFunctions.forEach(f => f(this));
      }

      this._initialized = true;
    });
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

  public isReducedLicense() {
    return this._isReducedLicense;
  }

  public isFullLicense() {
    return this._isFullLicense;
  }
}
