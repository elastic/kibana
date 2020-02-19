/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup, CoreStart } from 'src/core/public';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { DataPublicPluginStart } from '../../../../src/plugins/data/public';
import {
  FeatureCatalogueCategory,
  HomePublicPluginSetup,
} from '../../../../src/plugins/home/public';
import { LicensingPluginSetup } from '../../licensing/public';
import { ManagementSetup, ManagementStart } from '../../../../src/plugins/management/public';
import {
  SessionExpired,
  SessionTimeout,
  ISessionTimeout,
  SessionTimeoutHttpInterceptor,
  UnauthorizedResponseHttpInterceptor,
} from './session';
import { SecurityLicenseService } from '../common/licensing';
import { SecurityNavControlService } from './nav_control';
import { AccountManagementPage } from './account_management';
import { AuthenticationService, AuthenticationServiceSetup } from './authentication';
import { ManagementService, UserAPIClient } from './management';

export interface PluginSetupDependencies {
  licensing: LicensingPluginSetup;
  home?: HomePublicPluginSetup;
  management?: ManagementSetup;
}

export interface PluginStartDependencies {
  data: DataPublicPluginStart;
  management?: ManagementStart;
}

export class SecurityPlugin
  implements
    Plugin<
      SecurityPluginSetup,
      SecurityPluginStart,
      PluginSetupDependencies,
      PluginStartDependencies
    > {
  private sessionTimeout!: ISessionTimeout;
  private readonly navControlService = new SecurityNavControlService();
  private readonly securityLicenseService = new SecurityLicenseService();
  private readonly managementService = new ManagementService();
  private authc!: AuthenticationServiceSetup;

  public setup(
    core: CoreSetup<PluginStartDependencies>,
    { home, licensing, management }: PluginSetupDependencies
  ) {
    const { http, notifications, injectedMetadata } = core;
    const { anonymousPaths } = http;
    anonymousPaths.register('/login');
    anonymousPaths.register('/logout');
    anonymousPaths.register('/logged_out');

    const tenant = injectedMetadata.getInjectedVar('session.tenant', '') as string;
    const logoutUrl = injectedMetadata.getInjectedVar('logoutUrl') as string;
    const sessionExpired = new SessionExpired(logoutUrl, tenant);
    http.intercept(new UnauthorizedResponseHttpInterceptor(sessionExpired, anonymousPaths));
    this.sessionTimeout = new SessionTimeout(notifications, sessionExpired, http, tenant);
    http.intercept(new SessionTimeoutHttpInterceptor(this.sessionTimeout, anonymousPaths));

    const { license } = this.securityLicenseService.setup({ license$: licensing.license$ });

    this.authc = new AuthenticationService().setup({ http: core.http });

    this.navControlService.setup({
      securityLicense: license,
      authc: this.authc,
    });

    if (management) {
      this.managementService.setup({
        license,
        management,
        authc: this.authc,
        fatalErrors: core.fatalErrors,
        getStartServices: core.getStartServices,
      });
    }

    if (management && home) {
      home.featureCatalogue.register({
        id: 'security',
        title: i18n.translate('xpack.security.registerFeature.securitySettingsTitle', {
          defaultMessage: 'Security Settings',
        }),
        description: i18n.translate('xpack.security.registerFeature.securitySettingsDescription', {
          defaultMessage:
            'Protect your data and easily manage who has access to what with users and roles.',
        }),
        icon: 'securityApp',
        path: '/app/kibana#/management/security/users',
        showOnHomePage: true,
        category: FeatureCatalogueCategory.ADMIN,
      });
    }

    return {
      authc: this.authc,
      sessionTimeout: this.sessionTimeout,
      license,
    };
  }

  public start(core: CoreStart, { management }: PluginStartDependencies) {
    this.sessionTimeout.start();
    this.navControlService.start({ core });

    if (management) {
      this.managementService.start({ management });
    }

    return {
      __legacyCompat: {
        account_management: {
          AccountManagementPage: () => (
            <core.i18n.Context>
              <AccountManagementPage
                authc={this.authc}
                notifications={core.notifications}
                apiClient={new UserAPIClient(core.http)}
              />
            </core.i18n.Context>
          ),
        },
      },
    };
  }

  public stop() {
    this.sessionTimeout.stop();
    this.navControlService.stop();
    this.securityLicenseService.stop();
    this.managementService.stop();
  }
}

export type SecurityPluginSetup = ReturnType<SecurityPlugin['setup']>;
export type SecurityPluginStart = ReturnType<SecurityPlugin['start']>;
