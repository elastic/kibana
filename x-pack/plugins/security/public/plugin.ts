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
  SessionTimeoutHttpInterceptor,
  UnauthorizedResponseHttpInterceptor,
} from './session';
import { SecurityLicenseService } from '../common/licensing';
import { SecurityNavControlService } from './nav_control';

export interface PluginSetupDependencies {
  licensing: LicensingPluginSetup;
}

export class SecurityPlugin implements Plugin<SecurityPluginSetup, SecurityPluginStart> {
  private sessionTimeout!: SessionTimeout;

  private navControlService!: SecurityNavControlService;

  private securityLicenseService!: SecurityLicenseService;

  public setup(core: CoreSetup, { licensing }: PluginSetupDependencies) {
    const { http, notifications, injectedMetadata } = core;
    const { basePath, anonymousPaths } = http;
    anonymousPaths.register('/login');
    anonymousPaths.register('/logout');
    anonymousPaths.register('/logged_out');

    const tenant = `${injectedMetadata.getInjectedVar('session.tenant', '')}`;
    const sessionExpired = new SessionExpired(basePath, tenant);
    http.intercept(new UnauthorizedResponseHttpInterceptor(sessionExpired, anonymousPaths));
    this.sessionTimeout = new SessionTimeout(notifications, sessionExpired, http, tenant);
    http.intercept(new SessionTimeoutHttpInterceptor(this.sessionTimeout, anonymousPaths));

    this.navControlService = new SecurityNavControlService();
    this.securityLicenseService = new SecurityLicenseService();
    const { license } = this.securityLicenseService.setup({ license$: licensing.license$ });

    this.navControlService.setup({
      securityLicense: license,
    });

    return {
      anonymousPaths,
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
