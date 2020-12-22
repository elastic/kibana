/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { assertNever } from '@kbn/std';
import { Observable, Subscription } from 'rxjs';
import { LicensingPluginStart } from '../../../licensing/server';
import { ILicense, LicenseType } from '../../../licensing/common/types';
import { PLUGIN } from '../constants/plugin';
import { getAlertTypeFeatureUsageName } from './get_alert_type_feature_usage_name';
import {
  AlertType,
  AlertTypeParams,
  AlertTypeState,
  AlertInstanceState,
  AlertInstanceContext,
} from '../types';
import { AlertTypeDisabledError } from './errors/alert_type_disabled';

export type ILicenseState = PublicMethodsOf<LicenseState>;

export interface AlertingLicenseInformation {
  showAppLink: boolean;
  enableAppLink: boolean;
  message: string;
}

export class LicenseState {
  private licenseInformation: AlertingLicenseInformation = this.checkLicense(undefined);
  private subscription: Subscription;
  private license?: ILicense;
  private _notifyUsage: LicensingPluginStart['featureUsage']['notifyUsage'] | null = null;

  constructor(license$: Observable<ILicense>) {
    this.subscription = license$.subscribe(this.updateInformation.bind(this));
  }

  private updateInformation(license: ILicense | undefined) {
    this.license = license;
    this.licenseInformation = this.checkLicense(license);
  }

  public clean() {
    this.subscription.unsubscribe();
  }

  public getLicenseInformation() {
    return this.licenseInformation;
  }

  public setNotifyUsage(notifyUsage: LicensingPluginStart['featureUsage']['notifyUsage']) {
    this._notifyUsage = notifyUsage;
  }

  public getLicenseCheckForAlertType(
    alertTypeId: string,
    alertTypeName: string,
    minimumLicenseRequired: LicenseType,
    { notifyUsage }: { notifyUsage: boolean } = { notifyUsage: false }
  ): { isValid: true } | { isValid: false; reason: 'unavailable' | 'expired' | 'invalid' } {
    if (notifyUsage) {
      this.notifyUsage(alertTypeName, minimumLicenseRequired);
    }

    if (!this.license?.isAvailable) {
      return { isValid: false, reason: 'unavailable' };
    }

    const check = this.license.check(alertTypeId, minimumLicenseRequired);

    switch (check.state) {
      case 'expired':
        return { isValid: false, reason: 'expired' };
      case 'invalid':
        return { isValid: false, reason: 'invalid' };
      case 'unavailable':
        return { isValid: false, reason: 'unavailable' };
      case 'valid':
        return { isValid: true };
      default:
        return assertNever(check.state);
    }
  }

  private notifyUsage(alertTypeName: string, minimumLicenseRequired: LicenseType) {
    // No need to notify usage on basic alert types
    if (this._notifyUsage && minimumLicenseRequired !== 'basic') {
      this._notifyUsage(getAlertTypeFeatureUsageName(alertTypeName));
    }
  }

  public checkLicense(license: ILicense | undefined): AlertingLicenseInformation {
    if (!license || !license.isAvailable) {
      return {
        showAppLink: true,
        enableAppLink: false,
        message: i18n.translate(
          'xpack.alerts.serverSideErrors.unavailableLicenseInformationErrorMessage',
          {
            defaultMessage:
              'Alerts is unavailable - license information is not available at this time.',
          }
        ),
      };
    }

    const check = license.check(PLUGIN.ID, PLUGIN.MINIMUM_LICENSE_REQUIRED);

    switch (check.state) {
      case 'expired':
        return {
          showAppLink: true,
          enableAppLink: false,
          message: check.message || '',
        };
      case 'invalid':
      case 'unavailable':
        return {
          showAppLink: false,
          enableAppLink: false,
          message: check.message || '',
        };
      case 'valid':
        return {
          showAppLink: true,
          enableAppLink: true,
          message: '',
        };
      default:
        return assertNever(check.state);
    }
  }

  public ensureLicenseForAlertType<
    Params extends AlertTypeParams,
    State extends AlertTypeState,
    InstanceState extends AlertInstanceState,
    InstanceContext extends AlertInstanceContext,
    ActionGroupIds extends string,
    RecoveryActionGroupId extends string
  >(
    alertType: AlertType<
      Params,
      State,
      InstanceState,
      InstanceContext,
      ActionGroupIds,
      RecoveryActionGroupId
    >
  ) {
    this.notifyUsage(alertType.name, alertType.minimumLicenseRequired);

    const check = this.getLicenseCheckForAlertType(
      alertType.id,
      alertType.name,
      alertType.minimumLicenseRequired
    );

    if (check.isValid) {
      return;
    }
    switch (check.reason) {
      case 'unavailable':
        throw new AlertTypeDisabledError(
          i18n.translate('xpack.alerts.serverSideErrors.unavailableLicenseErrorMessage', {
            defaultMessage:
              'Alert type {alertTypeId} is disabled because license information is not available at this time.',
            values: {
              alertTypeId: alertType.id,
            },
          }),
          'license_unavailable'
        );
      case 'expired':
        throw new AlertTypeDisabledError(
          i18n.translate('xpack.alerts.serverSideErrors.expirerdLicenseErrorMessage', {
            defaultMessage:
              'Alert type {alertTypeId} is disabled because your {licenseType} license has expired.',
            values: { alertTypeId: alertType.id, licenseType: this.license!.type },
          }),
          'license_expired'
        );
      case 'invalid':
        throw new AlertTypeDisabledError(
          i18n.translate('xpack.alerts.serverSideErrors.invalidLicenseErrorMessage', {
            defaultMessage:
              'Alert {alertTypeId} is disabled because it requires a Gold license. Contact your administrator to upgrade your license.',
            values: { alertTypeId: alertType.id },
          }),
          'license_invalid'
        );
      default:
        assertNever(check.reason);
    }
  }
}

export function verifyApiAccessFactory(licenseState: LicenseState) {
  function verifyApiAccess() {
    const licenseCheckResults = licenseState.getLicenseInformation();

    if (licenseCheckResults.showAppLink && licenseCheckResults.enableAppLink) {
      return null;
    }

    throw Boom.forbidden(licenseCheckResults.message);
  }
  return verifyApiAccess;
}
