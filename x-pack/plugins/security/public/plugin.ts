/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup } from 'kibana/public';
import { UnauthorizedResponseInterceptor } from './unauthorized_response_interceptor';

export class SecurityPlugin implements Plugin<SecurityPluginSetup, SecurityPluginStart> {
  public setup(core: CoreSetup, deps: {}) {
    core.http.intercept(new UnauthorizedResponseInterceptor(core.http.basePath));
  }

  public start() {}
}

export type SecurityPluginSetup = ReturnType<SecurityPlugin['setup']>;
export type SecurityPluginStart = ReturnType<SecurityPlugin['start']>;
