/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable, Subscription, BehaviorSubject } from 'rxjs';
import { deepFreeze } from '../../../../../src/core/utils';
import { ILicense } from '../../../licensing/common/types';
import { SecurityLicenseFeatures } from './license_features';

export interface SecurityLicense {
  getChanges$(): Observable<void>;
  isEnabled(): boolean;
  getFeatures(): SecurityLicenseFeatures;
}

interface SetupDeps {
  license$: Observable<ILicense>;
}

export class SecurityLicenseService {
  private licenseSubscription?: Subscription;

  public setup({ license$ }: SetupDeps) {
    let rawLicense: Readonly<ILicense> | undefined;

    const changesSubject$ = new BehaviorSubject<void>(undefined);

    this.licenseSubscription = license$.subscribe(nextRawLicense => {
      rawLicense = nextRawLicense;
      changesSubject$.next();
    });

    return {
      license: deepFreeze({
        /**
         * Observable which notifies consumers when new license information is available.
         */
        getChanges$() {
          return changesSubject$.asObservable();
        },

        isEnabled() {
          if (!rawLicense) {
            return false;
          }

          const securityFeature = rawLicense.getFeature('security');
          return (
            securityFeature !== undefined &&
            securityFeature.isAvailable &&
            securityFeature.isEnabled
          );
        },

        /**
         * Returns up-do-date Security related features based on the last known license.
         */
        getFeatures(): SecurityLicenseFeatures {
          // If, for some reason, we cannot get license information from Elasticsearch,
          // assume worst-case and lock user at login screen.
          if (rawLicense === undefined || !rawLicense.isAvailable) {
            return {
              showLogin: true,
              allowLogin: false,
              showLinks: false,
              allowRoleDocumentLevelSecurity: false,
              allowRoleFieldLevelSecurity: false,
              allowRbac: false,
              layout:
                rawLicense !== undefined && !rawLicense.isAvailable
                  ? 'error-xpack-unavailable'
                  : 'error-es-unavailable',
            };
          }

          if (!this.isEnabled()) {
            return {
              showLogin: false,
              allowLogin: false,
              showLinks: false,
              allowRoleDocumentLevelSecurity: false,
              allowRoleFieldLevelSecurity: false,
              allowRbac: false,
              linksMessage: 'Access is denied because Security is disabled in Elasticsearch.',
            };
          }

          const isLicensePlatinumOrTrial = rawLicense.isOneOf(['platinum', 'trial']);
          return {
            showLogin: true,
            allowLogin: true,
            showLinks: true,
            // Only platinum and trial licenses are compliant with field- and document-level security.
            allowRoleDocumentLevelSecurity: isLicensePlatinumOrTrial,
            allowRoleFieldLevelSecurity: isLicensePlatinumOrTrial,
            allowRbac: true,
          };
        },
      }),
    };
  }

  public stop() {
    if (this.licenseSubscription) {
      this.licenseSubscription.unsubscribe();
      this.licenseSubscription = undefined;
    }
  }
}
