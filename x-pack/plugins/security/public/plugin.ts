/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup, CoreStart } from 'src/core/public';
import { LicensingPluginSetup } from '../../licensing/public';
import {
  SessionExpired,
  SessionTimeout,
  ISessionTimeout,
  SessionTimeoutHttpInterceptor,
  UnauthorizedResponseHttpInterceptor,
} from './session';
import { SecurityLicenseService } from '../common/licensing';
import { SecurityNavControlService } from './nav_control';
import { AuthenticationService } from './authentication';

export interface PluginSetupDependencies {
  licensing: LicensingPluginSetup;
}

export class SecurityPlugin implements Plugin<SecurityPluginSetup, SecurityPluginStart> {
  private sessionTimeout!: ISessionTimeout;

  private navControlService!: SecurityNavControlService;

  private securityLicenseService!: SecurityLicenseService;

  public setup(core: CoreSetup, { licensing }: PluginSetupDependencies) {
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

    this.navControlService = new SecurityNavControlService();
    this.securityLicenseService = new SecurityLicenseService();
    const { license } = this.securityLicenseService.setup({ license$: licensing.license$ });

    const authc = new AuthenticationService().setup({ http: core.http });

    this.navControlService.setup({
      securityLicense: license,
      authc,
    });

    return {
      authc,
      sessionTimeout: this.sessionTimeout,
    };
  }

  public start(core: CoreStart) {
    this.sessionTimeout.start();
    this.navControlService.start({ core });
  }

  public stop() {
    this.sessionTimeout.stop();
    this.navControlService.stop();
    this.securityLicenseService.stop();
  }
}

export type SecurityPluginSetup = ReturnType<SecurityPlugin['setup']>;
export type SecurityPluginStart = ReturnType<SecurityPlugin['start']>;
