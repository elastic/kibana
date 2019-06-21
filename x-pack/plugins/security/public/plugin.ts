/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup } from 'kibana/public';

export class SecurityPlugin implements Plugin<SecurityPluginSetup, SecurityPluginStart> {
  public setup(core: CoreSetup, deps: {}) {
    // eslint-disable-next-line no-console
    console.log(`Security plugin set up`);
    return {
      foo: 'bar',
    };
  }

  public start() {
    // eslint-disable-next-line no-console
    console.log(`Security plugin started`);
  }
}

export type SecurityPluginSetup = ReturnType<SecurityPlugin['setup']>;
export type SecurityPluginStart = ReturnType<SecurityPlugin['start']>;
