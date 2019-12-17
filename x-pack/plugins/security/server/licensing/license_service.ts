/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { deepFreeze } from '../../../../../src/core/utils';
import { ILicense } from '../../../licensing/server';
import { SecurityLicenseFeatures } from './license_features';

export interface SecurityLicense {
  isEnabled(): boolean;
  getFeatures(): SecurityLicenseFeatures;
}

export class SecurityLicenseService {
  public setup() {
    let rawLicense: Readonly<ILicense> | undefined;

    return {
      update(newRawLicense: Readonly<ILicense>) {
        rawLicense = newRawLicense;
      },

      license: deepFreeze({
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
              showRoleMappingsManagement: false,
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
              showRoleMappingsManagement: false,
              allowRoleDocumentLevelSecurity: false,
              allowRoleFieldLevelSecurity: false,
              allowRbac: false,
              linksMessage: 'Access is denied because Security is disabled in Elasticsearch.',
            };
          }

          const isLicensePlatinumOrBetter = rawLicense.isOneOf(['platinum', 'enterprise', 'trial']);
          return {
            showLogin: true,
            allowLogin: true,
            showLinks: true,
            // Role mappings are currently only applicable with paid auth realms.
            // The free realms (native, file) do not support role mappings, so the UI to manage them is useless.
            showRoleMappingsManagement: rawLicense.isNotBasic,
            // Only platinum and trial licenses are compliant with field- and document-level security.
            allowRoleDocumentLevelSecurity: isLicensePlatinumOrBetter,
            allowRoleFieldLevelSecurity: isLicensePlatinumOrBetter,
            allowRbac: true,
          };
        },
      }),
    };
  }
}
