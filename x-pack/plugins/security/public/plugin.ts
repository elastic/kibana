/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup, CoreStart } from 'src/core/public';
import { Subscription, Observable } from 'rxjs';
import { LicensingPluginSetup, ILicense } from '../../licensing/public';
import {
  SessionExpired,
  SessionTimeout,
  SessionTimeoutHttpInterceptor,
  UnauthorizedResponseHttpInterceptor,
} from './session';
import { AuthenticatedUser } from '../common/model';
import { SecurityLicenseService } from '../common/licensing';
import { registerSecurityNavControl } from './nav_control/nav_control';

export interface PluginSetupDependencies {
  licensing: LicensingPluginSetup;
}

export class SecurityPlugin implements Plugin<SecurityPluginSetup, SecurityPluginStart> {
  private sessionTimeout!: SessionTimeout;

  private license$!: Observable<ILicense>;

  private licenseSubscription?: Subscription;

  private navControlRegistered = false;

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

    this.license$ = licensing.license$;

    const user = core.http.get('/api/security/v1/me') as Promise<AuthenticatedUser>;

    return {
      anonymousPaths,
      sessionTimeout: this.sessionTimeout,
    };
  }

  public start(core: CoreStart) {
    this.sessionTimeout.start();

    const user = core.http.get('/api/security/v1/me') as Promise<AuthenticatedUser>;

    const securityLicenseService = new SecurityLicenseService().setup();
    this.licenseSubscription = this.license$.subscribe(rawLicense => {
      securityLicenseService.update(rawLicense);

      const isAnonymousPath = core.http.anonymousPaths.isAnonymous(window.location.pathname);
      const showSecurityLinks = securityLicenseService.license.getFeatures().showLinks;

      const shouldRegisterNavControl = !isAnonymousPath && showSecurityLinks;

      if (shouldRegisterNavControl && !this.navControlRegistered) {
        registerSecurityNavControl(core, user);
        this.navControlRegistered = true;
      }
    });
  }

  public stop() {
    this.sessionTimeout.stop();
    if (this.licenseSubscription) {
      this.licenseSubscription.unsubscribe();
      this.licenseSubscription = undefined;
    }
    this.navControlRegistered = false;
  }
}

export type SecurityPluginSetup = ReturnType<SecurityPlugin['setup']>;
export type SecurityPluginStart = ReturnType<SecurityPlugin['start']>;
