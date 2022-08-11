/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { Observable, Subscription } from 'rxjs';
import { assertNever } from '@kbn/std';
import { ILicense } from '@kbn/licensing-plugin/common/types';
import { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import { PLUGIN } from '../constants/plugin';
import { ActionType } from '../types';
import { ActionTypeDisabledError } from './errors';
import { getActionTypeFeatureUsageName } from './get_action_type_feature_usage_name';

export type ILicenseState = PublicMethodsOf<LicenseState>;

export interface ActionsLicenseInformation {
  showAppLink: boolean;
  enableAppLink: boolean;
  message: string;
}

export class LicenseState {
  private licenseInformation: ActionsLicenseInformation = this.checkLicense(undefined);
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

  public setNotifyUsage(notifyUsage: LicensingPluginStart['featureUsage']['notifyUsage']) {
    this._notifyUsage = notifyUsage;
  }

  public clean() {
    this.subscription.unsubscribe();
  }

  public getLicenseInformation() {
    return this.licenseInformation;
  }

  public isLicenseValidForActionType(
    actionType: ActionType,
    { notifyUsage }: { notifyUsage: boolean } = { notifyUsage: false }
  ): { isValid: true } | { isValid: false; reason: 'unavailable' | 'expired' | 'invalid' } {
    if (notifyUsage) {
      this.notifyUsage(actionType);
    }

    if (!this.license?.isAvailable) {
      return { isValid: false, reason: 'unavailable' };
    }

    const check = this.license.check(actionType.id, actionType.minimumLicenseRequired);

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

  private notifyUsage(actionType: ActionType) {
    // No need to notify usage on basic action types
    if (this._notifyUsage && actionType.minimumLicenseRequired !== 'basic') {
      this._notifyUsage(getActionTypeFeatureUsageName(actionType));
    }
  }

  public ensureLicenseForActionType(actionType: ActionType) {
    this.notifyUsage(actionType);

    const check = this.isLicenseValidForActionType(actionType);

    if (check.isValid) {
      return;
    }

    switch (check.reason) {
      case 'unavailable':
        throw new ActionTypeDisabledError(
          i18n.translate('xpack.actions.serverSideErrors.unavailableLicenseErrorMessage', {
            defaultMessage:
              'Action type {actionTypeId} is disabled because license information is not available at this time.',
            values: {
              actionTypeId: actionType.id,
            },
          }),
          'license_unavailable'
        );
      case 'expired':
        throw new ActionTypeDisabledError(
          i18n.translate('xpack.actions.serverSideErrors.expirerdLicenseErrorMessage', {
            defaultMessage:
              'Action type {actionTypeId} is disabled because your {licenseType} license has expired.',
            values: { actionTypeId: actionType.id, licenseType: this.license!.type },
          }),
          'license_expired'
        );
      case 'invalid':
        throw new ActionTypeDisabledError(
          i18n.translate('xpack.actions.serverSideErrors.invalidLicenseErrorMessage', {
            defaultMessage:
              'Action type {actionTypeId} is disabled because your {licenseType} license does not support it. Please upgrade your license.',
            values: { actionTypeId: actionType.id, licenseType: this.license!.type },
          }),
          'license_invalid'
        );
      default:
        assertNever(check.reason);
    }
  }

  public checkLicense(license: ILicense | undefined): ActionsLicenseInformation {
    if (!license?.isAvailable) {
      return {
        showAppLink: true,
        enableAppLink: false,
        message: i18n.translate(
          'xpack.actions.serverSideErrors.unavailableLicenseInformationErrorMessage',
          {
            defaultMessage:
              'Actions is unavailable - license information is not available at this time.',
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
}
