/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { map } from 'rxjs/operators';
import { Observable, Subscription } from 'rxjs';
import { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import { ILicense } from '@kbn/licensing-plugin/common/types';
import { checkLicense, GraphLicenseInformation } from '../../common/check_license';

export class LicenseState {
  private licenseInformation: GraphLicenseInformation = checkLicense(undefined);
  private subscription: Subscription | null = null;
  private observable: Observable<GraphLicenseInformation> | null = null;
  private _notifyUsage: LicensingPluginStart['featureUsage']['notifyUsage'] | null = null;

  private updateInformation(licenseInformation: GraphLicenseInformation) {
    this.licenseInformation = licenseInformation;
  }

  public start(license$: Observable<ILicense>) {
    this.observable = license$.pipe(map(checkLicense));
    this.subscription = this.observable.subscribe(this.updateInformation.bind(this));
  }

  public setNotifyUsage(notifyUsage: LicensingPluginStart['featureUsage']['notifyUsage']) {
    this._notifyUsage = notifyUsage;
  }

  // 'Graph' is the only allowed feature here at the moment, if this gets extended in the future, add to the union type
  public notifyUsage(featureName: 'Graph') {
    if (this._notifyUsage) {
      this._notifyUsage(featureName);
    }
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
