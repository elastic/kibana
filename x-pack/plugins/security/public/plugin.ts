/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup } from 'src/core/public';
import { AnonymousPaths } from './anonymous_paths';
import {
  SessionExpired,
  SessionTimeout,
  SessionTimeoutHttpInterceptor,
  UnauthorizedResponseHttpInterceptor,
} from './session';

export class SecurityPlugin implements Plugin<SecurityPluginSetup, SecurityPluginStart> {
  public setup(core: CoreSetup, deps: {}) {
    const { http, notifications } = core;
    const { basePath } = http;
    const anonymousPaths = new AnonymousPaths(basePath, [
      '/login',
      '/logout',
      '/logged_out',
      '/status',
    ]);

    const sessionExpired = new SessionExpired(basePath);
    http.intercept(new UnauthorizedResponseHttpInterceptor(sessionExpired, anonymousPaths));
    const sessionTimeout = new SessionTimeout(1.5 * 60 * 1000, notifications, sessionExpired, http);
    http.intercept(new SessionTimeoutHttpInterceptor(sessionTimeout, anonymousPaths));

    return {
      anonymousPaths,
      sessionTimeout,
    };
  }

  public start() {}
}

export type SecurityPluginSetup = ReturnType<SecurityPlugin['setup']>;
export type SecurityPluginStart = ReturnType<SecurityPlugin['start']>;
