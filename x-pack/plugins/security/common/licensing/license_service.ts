/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

import type { ILicense, LicenseType } from '@kbn/licensing-plugin/common/types';

import type { SecurityLicenseFeatures } from './license_features';

export interface SecurityLicense {
  isLicenseAvailable(): boolean;
  isEnabled(): boolean;
  getFeatures(): SecurityLicenseFeatures;
  hasAtLeast(licenseType: LicenseType): boolean | undefined;
  features$: Observable<SecurityLicenseFeatures>;
}

interface SetupDeps {
  license$: Observable<ILicense>;
}

export class SecurityLicenseService {
  private licenseSubscription?: Subscription;

  public setup({ license$ }: SetupDeps) {
    let rawLicense: Readonly<ILicense> | undefined;

    this.licenseSubscription = license$.subscribe((nextRawLicense) => {
      rawLicense = nextRawLicense;
    });

    return {
      license: Object.freeze({
        isLicenseAvailable: () => rawLicense?.isAvailable ?? false,

        isEnabled: () => this.isSecurityEnabledFromRawLicense(rawLicense),

        hasAtLeast: (licenseType: LicenseType) => rawLicense?.hasAtLeast(licenseType),

        getFeatures: () => this.calculateFeaturesFromRawLicense(rawLicense),

        features$: license$.pipe(
          map((nextRawLicense) => this.calculateFeaturesFromRawLicense(nextRawLicense))
        ),
      }),
    };
  }

  public stop() {
    if (this.licenseSubscription) {
      this.licenseSubscription.unsubscribe();
      this.licenseSubscription = undefined;
    }
  }

  private isSecurityEnabledFromRawLicense(rawLicense: Readonly<ILicense> | undefined) {
    if (!rawLicense) {
      return false;
    }

    const securityFeature = rawLicense.getFeature('security');
    return (
      securityFeature !== undefined && securityFeature.isAvailable && securityFeature.isEnabled
    );
  }

  private calculateFeaturesFromRawLicense(
    rawLicense: Readonly<ILicense> | undefined
  ): SecurityLicenseFeatures {
    // If, for some reason, we cannot get license information from Elasticsearch,
    // assume worst-case and lock user at login screen.
    if (!rawLicense?.isAvailable) {
      return {
        showLogin: true,
        allowLogin: false,
        showLinks: false,
        showRoleMappingsManagement: false,
        allowAccessAgreement: false,
        allowAuditLogging: false,
        allowRoleDocumentLevelSecurity: false,
        allowRoleFieldLevelSecurity: false,
        allowRbac: false,
        allowSubFeaturePrivileges: false,
        layout:
          rawLicense !== undefined && !rawLicense?.isAvailable
            ? 'error-xpack-unavailable'
            : 'error-es-unavailable',
      };
    }

    if (!this.isSecurityEnabledFromRawLicense(rawLicense)) {
      return {
        showLogin: false,
        allowLogin: false,
        showLinks: false,
        showRoleMappingsManagement: false,
        allowAccessAgreement: false,
        allowAuditLogging: false,
        allowRoleDocumentLevelSecurity: false,
        allowRoleFieldLevelSecurity: false,
        allowRbac: false,
        allowSubFeaturePrivileges: false,
      };
    }

    const isLicenseGoldOrBetter = rawLicense.hasAtLeast('gold');
    const isLicensePlatinumOrBetter = rawLicense.hasAtLeast('platinum');
    return {
      showLogin: true,
      allowLogin: true,
      showLinks: true,
      showRoleMappingsManagement: isLicenseGoldOrBetter,
      allowAccessAgreement: isLicenseGoldOrBetter,
      allowAuditLogging: isLicenseGoldOrBetter,
      allowSubFeaturePrivileges: isLicenseGoldOrBetter,
      // Only platinum and trial licenses are compliant with field- and document-level security.
      allowRoleDocumentLevelSecurity: isLicensePlatinumOrBetter,
      allowRoleFieldLevelSecurity: isLicensePlatinumOrBetter,
      allowRbac: true,
    };
  }
}
