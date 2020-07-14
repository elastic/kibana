/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable, Subscription } from 'rxjs';
import { ILicense } from '../../licensing/common/types';

export type LicenseState = { valid: false; message: string } | { valid: true };

export type CheckLicense = (license: ILicense) => LicenseState;

const checkLicense: CheckLicense = (license) => {
  const check = license.check('globalSearch', 'basic');
  switch (check.state) {
    case 'expired':
      return { valid: false, message: 'expired' };
    case 'invalid':
      return { valid: false, message: 'invalid' };
    case 'unavailable':
      return { valid: false, message: 'unavailable' };
    case 'valid':
      return { valid: true };
    default:
      throw new Error(`Invalid license state: ${check.state}`);
  }
};

export type ILicenseChecker = PublicMethodsOf<LicenseChecker>;

export class LicenseChecker {
  private subscription: Subscription;
  private state: LicenseState = { valid: false, message: 'unknown' };

  constructor(license$: Observable<ILicense>) {
    this.subscription = license$.subscribe((license) => {
      this.state = checkLicense(license);
    });
  }

  public getState() {
    return this.state;
  }

  public clean() {
    this.subscription.unsubscribe();
  }
}
