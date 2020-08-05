/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from '../../../../src/core/public';
import { FeaturesPluginStart } from '../../features/public';
import { DataPublicPluginStart } from '../../../../src/plugins/data/public';
import {
  FeatureCatalogueCategory,
  HomePublicPluginSetup,
} from '../../../../src/plugins/home/public';
import { LicensingPluginSetup } from '../../licensing/public';
import { ManagementSetup, ManagementStart } from '../../../../src/plugins/management/public';
import {
  ISessionTimeout,
  SessionExpired,
  SessionTimeout,
  SessionTimeoutHttpInterceptor,
  UnauthorizedResponseHttpInterceptor,
} from './session';
import { SecurityLicenseService } from '../common/licensing';
import { SecurityNavControlService } from './nav_control';
import { AuthenticationService, AuthenticationServiceSetup } from './authentication';
import { ConfigType } from './config';
import { ManagementService } from './management';
import { accountManagementApp } from './account_management';

export interface PluginSetupDependencies {
  licensing: LicensingPluginSetup;
  home?: HomePublicPluginSetup;
  management?: ManagementSetup;
}

export interface PluginStartDependencies {
  data: DataPublicPluginStart;
  features: FeaturesPluginStart;
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
  private readonly authenticationService = new AuthenticationService();
  private readonly navControlService = new SecurityNavControlService();
  private readonly securityLicenseService = new SecurityLicenseService();
  private readonly managementService = new ManagementService();
  private authc!: AuthenticationServiceSetup;
  private readonly config: ConfigType;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<ConfigType>();
  }

  public setup(
    core: CoreSetup<PluginStartDependencies>,
    { home, licensing, management }: PluginSetupDependencies
  ) {
    const { http, notifications } = core;
    const { anonymousPaths } = http;

    const logoutUrl = `${core.http.basePath.serverBasePath}/logout`;
    const tenant = core.http.basePath.serverBasePath;

    const sessionExpired = new SessionExpired(logoutUrl, tenant);
    http.intercept(new UnauthorizedResponseHttpInterceptor(sessionExpired, anonymousPaths));
    this.sessionTimeout = new SessionTimeout(notifications, sessionExpired, http, tenant);
    http.intercept(new SessionTimeoutHttpInterceptor(this.sessionTimeout, anonymousPaths));

    const { license } = this.securityLicenseService.setup({ license$: licensing.license$ });

    this.authc = this.authenticationService.setup({
      application: core.application,
      config: this.config,
      getStartServices: core.getStartServices,
      http: core.http,
    });

    this.navControlService.setup({
      securityLicense: license,
      authc: this.authc,
      logoutUrl,
    });

    accountManagementApp.create({
      authc: this.authc,
      application: core.application,
      getStartServices: core.getStartServices,
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
        path: '/app/management/security/users',
        showOnHomePage: true,
        category: FeatureCatalogueCategory.ADMIN,
      });
    }

    return {
      authc: this.authc,
      sessionTimeout: this.sessionTimeout,
      license,
      __legacyCompat: { logoutUrl, tenant },
    };
  }

  public start(core: CoreStart, { management }: PluginStartDependencies) {
    this.sessionTimeout.start();
    this.navControlService.start({ core });
    if (management) {
      this.managementService.start();
    }
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
