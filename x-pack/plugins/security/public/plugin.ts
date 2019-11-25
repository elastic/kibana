/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup } from 'src/core/public';
import {
  SessionExpired,
  SessionTimeout,
  SessionTimeoutHttpInterceptor,
  UnauthorizedResponseHttpInterceptor,
} from './session';

export class SecurityPlugin implements Plugin<SecurityPluginSetup, SecurityPluginStart> {
  private sessionTimeout!: SessionTimeout;

  public setup(core: CoreSetup) {
    const { http, notifications } = core;
    const { basePath, anonymousPaths } = http;
    anonymousPaths.register('/login');
    anonymousPaths.register('/logout');
    anonymousPaths.register('/logged_out');

    const sessionExpired = new SessionExpired(basePath);
    http.intercept(new UnauthorizedResponseHttpInterceptor(sessionExpired, anonymousPaths));
    this.sessionTimeout = new SessionTimeout(notifications, sessionExpired, http);
    http.intercept(new SessionTimeoutHttpInterceptor(this.sessionTimeout, anonymousPaths));

    return {
      anonymousPaths,
      sessionTimeout: this.sessionTimeout,
    };
  }

  public start() {
    this.sessionTimeout.start();
  }

  public stop() {
    this.sessionTimeout.stop();
  }
}

export type SecurityPluginSetup = ReturnType<SecurityPlugin['setup']>;
export type SecurityPluginStart = ReturnType<SecurityPlugin['start']>;
