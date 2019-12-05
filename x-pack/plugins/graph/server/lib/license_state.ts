/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Observable, Subscription } from 'rxjs';
import { ILicense } from '../../../licensing/common/types';
import { checkLicense, GraphLicenseInformation } from '../../common/check_license';

export class LicenseState {
  private licenseInformation: GraphLicenseInformation = checkLicense(undefined);
  private subscription: Subscription | null = null;

  private updateInformation(license: ILicense | undefined) {
    this.licenseInformation = checkLicense(license);
  }

  public start(license$: Observable<ILicense>) {
    this.subscription = license$.subscribe(this.updateInformation.bind(this));
  }

  public stop() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  public getLicenseInformation() {
    return this.licenseInformation;
  }
}

export function verifyApiAccess(licenseState: LicenseState) {
  const licenseCheckResults = licenseState.getLicenseInformation();

  if (licenseCheckResults.showAppLink && licenseCheckResults.enableAppLink) {
    return;
  }

  throw Boom.forbidden(licenseCheckResults.message);
}
