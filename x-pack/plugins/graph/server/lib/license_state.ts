/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { map } from 'rxjs/operators';
import { Observable, Subscription } from 'rxjs';
import { ILicense } from '../../../licensing/common/types';
import { checkLicense, GraphLicenseInformation } from '../../common/check_license';

export class LicenseState {
  private licenseInformation: GraphLicenseInformation = checkLicense(undefined);
  private subscription: Subscription | null = null;
  private observable: Observable<GraphLicenseInformation> | null = null;

  private updateInformation(licenseInformation: GraphLicenseInformation) {
    this.licenseInformation = licenseInformation;
  }

  public start(license$: Observable<ILicense>) {
    this.observable = license$.pipe(map(checkLicense));
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
}

export function verifyApiAccess(licenseState: LicenseState) {
  const licenseCheckResults = licenseState.getLicenseInformation();

  if (licenseCheckResults.showAppLink && licenseCheckResults.enableAppLink) {
    return;
  }

  throw Boom.forbidden(licenseCheckResults.message);
}
