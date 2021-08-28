/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import type { CoreSetup, CoreStart } from '../../../../src/core/public/types';
import type { Plugin } from '../../../../src/core/public/plugins/plugin';
import type { PluginInitializerContext } from '../../../../src/core/public/plugins/plugin_context';
import type { DataPublicPluginStart } from '../../../../src/plugins/data/public/types';
import type { HomePublicPluginSetup } from '../../../../src/plugins/home/public/plugin';
import { FeatureCatalogueCategory } from '../../../../src/plugins/home/public/services/feature_catalogue/feature_catalogue_registry';
import type {
  ManagementSetup,
  ManagementStart,
} from '../../../../src/plugins/management/public/types';
import type {
  SecurityOssPluginSetup,
  SecurityOssPluginStart,
} from '../../../../src/plugins/security_oss/public/plugin';
import type { FeaturesPluginStart } from '../../features/public/plugin';
import type { LicensingPluginSetup } from '../../licensing/public/types';
import type { SpacesPluginStart } from '../../spaces/public/plugin';
import type { SecurityLicense } from '../common/licensing/license_service';
import { SecurityLicenseService } from '../common/licensing/license_service';
import { accountManagementApp } from './account_management/account_management_app';
import type {
  AuthenticationServiceSetup,
  AuthenticationServiceStart,
} from './authentication/authentication_service';
import { AuthenticationService } from './authentication/authentication_service';
import type { ConfigType } from './config';
import { ManagementService } from './management/management_service';
import type { SecurityNavControlServiceStart } from './nav_control/nav_control_service';
import { SecurityNavControlService } from './nav_control/nav_control_service';
import { SecurityCheckupService } from './security_checkup/security_checkup_service';
import { SessionExpired } from './session/session_expired';
import { SessionTimeout } from './session/session_timeout';
import { UnauthorizedResponseHttpInterceptor } from './session/unauthorized_response_http_interceptor';
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
