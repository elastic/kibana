/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, PluginInitializerContext } from 'src/core/server';

export class UptimePlugin implements Plugin<UptimeSetup> {
  private readonly initContext: PluginInitializerContext;

  constructor(initContext: PluginInitializerContext) {
    this.initContext = initContext;
  }

  public setup() {
    console.log("X")
    console.log("SET IT UP")
    console.log("X")
    return {
      __legacy: {
        config: this.initContext.config,
      },
    };
  }

  public start() {}
  public stop() {}
}

export interface UptimeSetup {
  /** @deprecated */
  __legacy: {
    config: PluginInitializerContext['config'];
  };
}
