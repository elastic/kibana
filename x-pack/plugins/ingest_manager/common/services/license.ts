/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Observable, Subscription } from 'rxjs';
import { ILicense } from '../../../licensing/common/types';

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

  public isGoldPlus() {
    return (
      this.licenseInformation?.isAvailable &&
      this.licenseInformation?.isActive &&
      this.licenseInformation?.hasAtLeast('gold')
    );
  }
  public isEnterprise() {
    return (
      this.licenseInformation?.isAvailable &&
      this.licenseInformation?.isActive &&
      this.licenseInformation?.hasAtLeast('enterprise')
    );
  }
}
