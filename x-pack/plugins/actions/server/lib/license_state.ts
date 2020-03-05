/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Observable, Subscription } from 'rxjs';
import { assertNever } from '../../../../../src/core/utils';
import { ILicense, LICENSE_CHECK_STATE } from '../../../licensing/common/types';
import { PLUGIN } from '../constants/plugin';
import { ActionType } from '../types';
import { ForbiddenError } from './errors';

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

  public isLicenseValidForActionType(
    actionType: ActionType
  ): { isValid: true } | { isValid: false; reason: 'unavailable' | 'expired' | 'invalid' } {
    if (!this.license?.isAvailable) {
      return { isValid: false, reason: 'unavailable' };
    }

    const check = this.license.check(actionType.id, actionType.minimumLicenseRequired);

    switch (check.state) {
      case LICENSE_CHECK_STATE.Expired:
        return { isValid: false, reason: 'expired' };
      case LICENSE_CHECK_STATE.Invalid:
        return { isValid: false, reason: 'invalid' };
      case LICENSE_CHECK_STATE.Unavailable:
        return { isValid: false, reason: 'unavailable' };
      case LICENSE_CHECK_STATE.Valid:
        return { isValid: true };
      default:
        return assertNever(check.state);
    }
  }

  public ensureLicenseForActionType(actionType: ActionType) {
    const check = this.isLicenseValidForActionType(actionType);

    if (check.isValid) {
      return;
    }

    switch (check.reason) {
      case 'unavailable':
        throw new ForbiddenError(
          i18n.translate('xpack.actions.serverSideErrors.unavailableLicenseErrorMessage', {
            defaultMessage:
              'Action type {actionTypeId} is disabled because license information is not available at this time.',
            values: {
              actionTypeId: actionType.id,
            },
          })
        );
      case 'expired':
        throw new ForbiddenError(
          i18n.translate('xpack.actions.serverSideErrors.expirerdLicenseErrorMessage', {
            defaultMessage:
              'Action type {actionTypeId} is disabled because your {licenseType} license has expired.',
            values: { actionTypeId: actionType.id, licenseType: this.license!.type },
          })
        );
      case 'invalid':
        throw new ForbiddenError(
          i18n.translate('xpack.actions.serverSideErrors.invalidLicenseErrorMessage', {
            defaultMessage:
              'Action type {actionTypeId} is disabled because your {licenseType} license does not support it. Please upgrade your license.',
            values: { actionTypeId: actionType.id, licenseType: this.license!.type },
          })
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
      case LICENSE_CHECK_STATE.Expired:
        return {
          showAppLink: true,
          enableAppLink: false,
          message: check.message || '',
        };
      case LICENSE_CHECK_STATE.Invalid:
      case LICENSE_CHECK_STATE.Unavailable:
        return {
          showAppLink: false,
          enableAppLink: false,
          message: check.message || '',
        };
      case LICENSE_CHECK_STATE.Valid:
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
