/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup } from 'src/core/public';
import { AnonymousPaths } from './anonymous_paths';
import { SessionExpired, SessionTimeout, SessionTimeoutInterceptor } from './session';
import { UnauthorizedResponseInterceptor } from './unauthorized_response_interceptor';

export class SecurityPlugin implements Plugin<SecurityPluginSetup, SecurityPluginStart> {
  public setup(core: CoreSetup, deps: {}) {
    const { http, notifications } = core;
    const sessionExpired = new SessionExpired(http.basePath);
    const anonymousPaths = new AnonymousPaths(http.basePath, [
      '/login',
      '/logout',
      '/logged_out',
      '/status',
    ]);
    http.intercept(new UnauthorizedResponseInterceptor(sessionExpired, anonymousPaths));

    const sessionTimeout = new SessionTimeout(1.5 * 60 * 1000, notifications, sessionExpired, http);
    http.intercept(new SessionTimeoutInterceptor(sessionTimeout, anonymousPaths));

    return {
      anonymousPaths,
      sessionTimeout,
    };
  }

  public start() {}
}

export type SecurityPluginSetup = ReturnType<SecurityPlugin['setup']>;
export type SecurityPluginStart = ReturnType<SecurityPlugin['start']>;
