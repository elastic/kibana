/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, Subscription } from 'rxjs';
import { ILicense, LicenseType } from '@kbn/licensing-plugin/common/types';

// Generic license service class that works with the license observable
// Both server and client plugins instancates a singleton version of this class
export class LicenseService {
  private observable: Observable<ILicense> | null = null;
  private subscription: Subscription | null = null;
  private licenseInformation: ILicense | null = null;

  private updateInformation(licenseInformation: ILicense) {
    this.licenseInformation = licenseInformation;
  }

  public start(license$: Observable<ILicense>) {
    this.observable = license$;
    this.subscription = this.observable.subscribe(this.updateInformation.bind(this));
  }

  public stop() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  public getLicenseInformation() {
    return this.licenseInformation;
  }

  public getLicenseInformation$() {
    return this.observable;
  }

  public isAtLeast(level: LicenseType): boolean {
    return isAtLeast(this.licenseInformation, level);
  }
  public isGoldPlus(): boolean {
    return this.isAtLeast('gold');
  }
  public isPlatinumPlus(): boolean {
    return this.isAtLeast('platinum');
  }
  public isEnterprise(): boolean {
    return this.isAtLeast('enterprise');
  }
}

export const isAtLeast = (license: ILicense | null, level: LicenseType): boolean => {
  return !!license && license.isAvailable && license.isActive && license.hasAtLeast(level);
};
