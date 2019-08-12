/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup } from 'src/core/public';
import { AnonymousPaths } from './anonymous_paths';
import { SessionExpired } from './session_expired';
import { SessionTimeout } from './session_timeout';
import { SessionTimeoutInterceptor } from './session_timeout_interceptor';
import { UnauthorizedResponseInterceptor } from './unauthorized_response_interceptor';

export class SecurityPlugin implements Plugin<SecurityPluginSetup, SecurityPluginStart> {
  public setup(core: CoreSetup, deps: {}) {
    const { basePath } = core.http;
    const anonymousPaths = new AnonymousPaths(basePath, [
      '/login',
      '/logout',
      '/logged_out',
      '/status',
      '/app/kibana',
    ]);
    core.http.intercept(
      new UnauthorizedResponseInterceptor(new SessionExpired(basePath), anonymousPaths)
    );

    const sessionTimeout = new SessionTimeout();
    core.http.intercept(new SessionTimeoutInterceptor(sessionTimeout, anonymousPaths));

    return {
      anonymousPaths,
      sessionTimeout,
    };
  }

  public start() {}
}

export type SecurityPluginSetup = ReturnType<SecurityPlugin['setup']>;
export type SecurityPluginStart = ReturnType<SecurityPlugin['start']>;
