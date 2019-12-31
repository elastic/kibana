/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Subscription } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { CoreSetup, FatalErrorsSetup } from 'src/core/public';
import {
  ManagementApp,
  ManagementSetup,
  ManagementStart,
} from '../../../../../src/plugins/management/public';
import { SecurityLicense } from '../../common/licensing';
import { AuthenticationServiceSetup } from '../authentication';
import { PluginStartDependencies } from '../plugin';
import { APIKeysManagementApp } from './api_keys';
import { RoleMappingsManagementApp } from './role_mappings';
import { RolesManagementApp } from './roles';
import { UsersManagementApp } from './users';

interface SetupParams {
  management: ManagementSetup;
  license: SecurityLicense;
  authc: AuthenticationServiceSetup;
  fatalErrors: FatalErrorsSetup;
  getStartServices: CoreSetup<PluginStartDependencies>['getStartServices'];
}

interface StartParams {
  management: ManagementStart;
}

export class ManagementService {
  private license!: SecurityLicense;
  private licenseFeaturesSubscription?: Subscription;

  setup({ getStartServices, management, authc, license, fatalErrors }: SetupParams) {
    this.license = license;

    const securitySection = management.sections.register({
      id: 'security',
      title: i18n.translate('xpack.security.management.securityTitle', {
        defaultMessage: 'Security',
      }),
      order: 100,
      euiIconType: 'securityApp',
    });

    securitySection.registerApp(UsersManagementApp.create({ authc, getStartServices }));
    securitySection.registerApp(
      RolesManagementApp.create({ fatalErrors, license, getStartServices })
    );
    securitySection.registerApp(APIKeysManagementApp.create({ getStartServices }));
    securitySection.registerApp(RoleMappingsManagementApp.create({ getStartServices }));
  }

  start({ management }: StartParams) {
    this.licenseFeaturesSubscription = this.license.features$.subscribe(async features => {
      const securitySection = management.sections.getSection('security')!;

      const securityManagementAppsStatuses: Array<[ManagementApp, boolean]> = [
        [securitySection.getApp(UsersManagementApp.id)!, features.showLinks],
        [securitySection.getApp(RolesManagementApp.id)!, features.showLinks],
        [securitySection.getApp(APIKeysManagementApp.id)!, features.showLinks],
        [
          securitySection.getApp(RoleMappingsManagementApp.id)!,
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

  // TODO: DO WE STILL NEED THIS?
  /* private checkLicense({
    management,
    notifications,
  }: Pick<StartParams, 'management' | 'notifications'>) {
    const { showLinks, linksMessage } = this.license.getFeatures();
    if (!showLinks) {
      notifications.toasts.addDanger({ title: linksMessage });
      management.sections.navigateToApp('management');
      return false;
    }

    return true;
  }*/
}
