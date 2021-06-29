/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'src/core/public';
import type { DataPublicPluginStart } from 'src/plugins/data/public';
import type { HomePublicPluginSetup } from 'src/plugins/home/public';
import type { ManagementSetup, ManagementStart } from 'src/plugins/management/public';
import type {
  SecurityOssPluginSetup,
  SecurityOssPluginStart,
} from 'src/plugins/security_oss/public';

import { FeatureCatalogueCategory } from '../../../../src/plugins/home/public';
import type { FeaturesPluginStart } from '../../features/public';
import type { LicensingPluginSetup } from '../../licensing/public';
import type { SpacesPluginStart } from '../../spaces/public';
import { SecurityLicenseService } from '../common/licensing';
import type { SecurityLicense } from '../common/licensing';
import { accountManagementApp } from './account_management';
import type { AuthenticationServiceSetup, AuthenticationServiceStart } from './authentication';
import { AuthenticationService } from './authentication';
import type { ConfigType } from './config';
import { ManagementService } from './management';
import type { SecurityNavControlServiceStart } from './nav_control';
import { SecurityNavControlService } from './nav_control';
import { SecurityCheckupService } from './security_checkup';
import { SessionExpired, SessionTimeout, UnauthorizedResponseHttpInterceptor } from './session';
import type { UiApi } from './ui_api';
import { getUiApi } from './ui_api';

export interface PluginSetupDependencies {
  licensing: LicensingPluginSetup;
  securityOss: SecurityOssPluginSetup;
  home?: HomePublicPluginSetup;
  management?: ManagementSetup;
}

export interface PluginStartDependencies {
  data: DataPublicPluginStart;
  features: FeaturesPluginStart;
  securityOss: SecurityOssPluginStart;
  management?: ManagementStart;
  spaces?: SpacesPluginStart;
}

export class SecurityPlugin
  implements
    Plugin<
      SecurityPluginSetup,
      SecurityPluginStart,
      PluginSetupDependencies,
      PluginStartDependencies
    > {
  private sessionTimeout!: SessionTimeout;
  private readonly authenticationService = new AuthenticationService();
  private readonly navControlService = new SecurityNavControlService();
  private readonly securityLicenseService = new SecurityLicenseService();
  private readonly managementService = new ManagementService();
  private readonly securityCheckupService = new SecurityCheckupService();
  private authc!: AuthenticationServiceSetup;
  private readonly config: ConfigType;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<ConfigType>();
  }

  public setup(
    core: CoreSetup<PluginStartDependencies>,
    { home, licensing, management, securityOss }: PluginSetupDependencies
  ): SecurityPluginSetup {
    const { http, notifications } = core;
    const { anonymousPaths } = http;

    const logoutUrl = `${core.http.basePath.serverBasePath}/logout`;
    const tenant = core.http.basePath.serverBasePath;

    const sessionExpired = new SessionExpired(logoutUrl, tenant);
    http.intercept(new UnauthorizedResponseHttpInterceptor(sessionExpired, anonymousPaths));
    this.sessionTimeout = new SessionTimeout(notifications, sessionExpired, http, tenant);

    const { license } = this.securityLicenseService.setup({ license$: licensing.license$ });

    this.securityCheckupService.setup({ securityOssSetup: securityOss });

    this.authc = this.authenticationService.setup({
      application: core.application,
      fatalErrors: core.fatalErrors,
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
          defaultMessage: 'Manage permissions',
        }),
        description: i18n.translate('xpack.security.registerFeature.securitySettingsDescription', {
          defaultMessage: 'Control who has access and what tasks they can perform.',
        }),
        icon: 'securityApp',
        path: '/app/management/security/roles',
        showOnHomePage: true,
        category: FeatureCatalogueCategory.ADMIN,
        order: 600,
      });
    }

    return {
      authc: this.authc,
      license,
    };
  }

  public start(
    core: CoreStart,
    { management, securityOss }: PluginStartDependencies
  ): SecurityPluginStart {
    this.sessionTimeout.start();
    this.securityCheckupService.start({ securityOssStart: securityOss, docLinks: core.docLinks });

    if (management) {
      this.managementService.start({ capabilities: core.application.capabilities });
    }

    return {
      uiApi: getUiApi({ core }),
      navControlService: this.navControlService.start({ core }),
      authc: this.authc as AuthenticationServiceStart,
    };
  }

  public stop() {
    this.sessionTimeout.stop();
    this.navControlService.stop();
    this.securityLicenseService.stop();
    this.managementService.stop();
    this.securityCheckupService.stop();
  }
}

export interface SecurityPluginSetup {
  /**
   * Exposes authentication information about the currently logged in user.
   */
  authc: AuthenticationServiceSetup;
  /**
   * Exposes information about the available security features under the current license.
   */
  license: SecurityLicense;
}

export interface SecurityPluginStart {
  /**
   * Exposes the ability to add custom links to the dropdown menu in the top right, where the user's Avatar is.
   */
  navControlService: SecurityNavControlServiceStart;
  /**
   * Exposes authentication information about the currently logged in user.
   */
  authc: AuthenticationServiceStart;
  /**
   * Exposes UI components that will be loaded asynchronously.
   */
  uiApi: UiApi;
}
