/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Subscription } from 'rxjs';
import { StartServicesAccessor, FatalErrorsSetup } from 'src/core/public';
import {
  ManagementApp,
  ManagementSetup,
  ManagementSection,
} from '../../../../../src/plugins/management/public';
import { SecurityLicense } from '../../common/licensing';
import { AuthenticationServiceSetup } from '../authentication';
import { PluginStartDependencies } from '../plugin';
import { apiKeysManagementApp } from './api_keys';
import { roleMappingsManagementApp } from './role_mappings';
import { rolesManagementApp } from './roles';
import { usersManagementApp } from './users';

interface SetupParams {
  management: ManagementSetup;
  license: SecurityLicense;
  authc: AuthenticationServiceSetup;
  fatalErrors: FatalErrorsSetup;
  getStartServices: StartServicesAccessor<PluginStartDependencies>;
}

export class ManagementService {
  private license!: SecurityLicense;
  private licenseFeaturesSubscription?: Subscription;
  private securitySection?: ManagementSection;

  setup({ getStartServices, management, authc, license, fatalErrors }: SetupParams) {
    this.license = license;
    this.securitySection = management.sections.section.security;

    this.securitySection.registerApp(usersManagementApp.create({ authc, getStartServices }));
    this.securitySection.registerApp(
      rolesManagementApp.create({ fatalErrors, license, getStartServices })
    );
    this.securitySection.registerApp(apiKeysManagementApp.create({ getStartServices }));
    this.securitySection.registerApp(roleMappingsManagementApp.create({ getStartServices }));
  }

  start() {
    this.licenseFeaturesSubscription = this.license.features$.subscribe(async (features) => {
      const securitySection = this.securitySection!;

      const securityManagementAppsStatuses: Array<[ManagementApp, boolean]> = [
        [securitySection.getApp(usersManagementApp.id)!, features.showLinks],
        [securitySection.getApp(rolesManagementApp.id)!, features.showLinks],
        [securitySection.getApp(apiKeysManagementApp.id)!, features.showLinks],
        [
          securitySection.getApp(roleMappingsManagementApp.id)!,
          features.showLinks && features.showRoleMappingsManagement,
        ],
      ];

      // Iterate over all registered apps and update their enable status depending on the available
      // license features.
      for (const [app, enableStatus] of securityManagementAppsStatuses) {
        if (app.enabled === enableStatus) {
          continue;
        }

        if (enableStatus) {
          app.enable();
        } else {
          app.disable();
        }
      }
    });
  }

  stop() {
    if (this.licenseFeaturesSubscription) {
      this.licenseFeaturesSubscription.unsubscribe();
      this.licenseFeaturesSubscription = undefined;
    }
  }
}
