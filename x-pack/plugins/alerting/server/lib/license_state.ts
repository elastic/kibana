/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { assertNever } from '@kbn/std';
import { capitalize } from 'lodash';
import { Observable, Subscription } from 'rxjs';
import { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import { ILicense, LicenseType } from '@kbn/licensing-plugin/common/types';
import { PLUGIN } from '../constants/plugin';
import { getRuleTypeFeatureUsageName } from './get_rule_type_feature_usage_name';
import {
  RuleType,
  RuleTypeParams,
  RuleTypeState,
  AlertInstanceState,
  AlertInstanceContext,
} from '../types';
import { RuleTypeDisabledError } from './errors/rule_type_disabled';

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

  public getIsSecurityEnabled(): boolean | null {
    if (!this.license || !this.license?.isAvailable) {
      return null;
    }

    const { isEnabled } = this.license.getFeature('security');
    return isEnabled;
  }

  public setNotifyUsage(notifyUsage: LicensingPluginStart['featureUsage']['notifyUsage']) {
    this._notifyUsage = notifyUsage;
  }

  public getLicenseCheckForRuleType(
    ruleTypeId: string,
    ruleTypeName: string,
    minimumLicenseRequired: LicenseType,
    { notifyUsage }: { notifyUsage: boolean } = { notifyUsage: false }
  ): { isValid: true } | { isValid: false; reason: 'unavailable' | 'expired' | 'invalid' } {
    if (notifyUsage) {
      this.notifyUsage(ruleTypeName, minimumLicenseRequired);
    }

    if (!this.license?.isAvailable) {
      return { isValid: false, reason: 'unavailable' };
    }

    const check = this.license.check(ruleTypeId, minimumLicenseRequired);

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

  private notifyUsage(ruleTypeName: string, minimumLicenseRequired: LicenseType) {
    // No need to notify usage on basic alert types
    if (this._notifyUsage && minimumLicenseRequired !== 'basic') {
      this._notifyUsage(getRuleTypeFeatureUsageName(ruleTypeName));
    }
  }

  public checkLicense(license: ILicense | undefined): AlertingLicenseInformation {
    if (!license || !license.isAvailable) {
      return {
        showAppLink: true,
        enableAppLink: false,
        message: i18n.translate(
          'xpack.alerting.serverSideErrors.unavailableLicenseInformationErrorMessage',
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

  public ensureLicenseForRuleType<
    Params extends RuleTypeParams,
    ExtractedParams extends RuleTypeParams,
    State extends RuleTypeState,
    InstanceState extends AlertInstanceState,
    InstanceContext extends AlertInstanceContext,
    ActionGroupIds extends string,
    RecoveryActionGroupId extends string
  >(
    ruleType: RuleType<
      Params,
      ExtractedParams,
      State,
      InstanceState,
      InstanceContext,
      ActionGroupIds,
      RecoveryActionGroupId
    >
  ) {
    this.notifyUsage(ruleType.name, ruleType.minimumLicenseRequired);

    const check = this.getLicenseCheckForRuleType(
      ruleType.id,
      ruleType.name,
      ruleType.minimumLicenseRequired
    );

    if (check.isValid) {
      return;
    }
    switch (check.reason) {
      case 'unavailable':
        throw new RuleTypeDisabledError(
          i18n.translate('xpack.alerting.serverSideErrors.unavailableLicenseErrorMessage', {
            defaultMessage:
              'Rule type {ruleTypeId} is disabled because license information is not available at this time.',
            values: {
              ruleTypeId: ruleType.id,
            },
          }),
          'license_unavailable'
        );
      case 'expired':
        throw new RuleTypeDisabledError(
          i18n.translate('xpack.alerting.serverSideErrors.expirerdLicenseErrorMessage', {
            defaultMessage:
              'Rule type {ruleTypeId} is disabled because your {licenseType} license has expired.',
            values: { ruleTypeId: ruleType.id, licenseType: this.license!.type },
          }),
          'license_expired'
        );
      case 'invalid':
        throw new RuleTypeDisabledError(
          i18n.translate('xpack.alerting.serverSideErrors.invalidLicenseErrorMessage', {
            defaultMessage:
              'Rule {ruleTypeId} is disabled because it requires a {licenseType} license. Go to License Management to view upgrade options.',
            values: {
              ruleTypeId: ruleType.id,
              licenseType: capitalize(ruleType.minimumLicenseRequired),
            },
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
