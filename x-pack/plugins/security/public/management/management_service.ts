/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';

import type { Capabilities, FatalErrorsSetup, StartServicesAccessor } from '@kbn/core/public';
import type {
  ManagementApp,
  ManagementSection,
  ManagementSetup,
} from '@kbn/management-plugin/public';

import type { SecurityLicense } from '../../common/licensing';
import type { AuthenticationServiceSetup } from '../authentication';
import type { PluginStartDependencies } from '../plugin';
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

interface StartParams {
  capabilities: Capabilities;
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
    this.securitySection.registerApp(apiKeysManagementApp.create({ authc, getStartServices }));
    this.securitySection.registerApp(roleMappingsManagementApp.create({ getStartServices }));
  }

  start({ capabilities }: StartParams) {
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
        if (capabilities.management.security[app.id] !== true) {
          app.disable();
          continue;
        }

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
