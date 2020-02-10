/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, PluginInitializerContext } from 'src/core/server';

export class RollupPlugin implements Plugin<RollupSetup> {
  private readonly initContext: PluginInitializerContext;

  constructor(initContext: PluginInitializerContext) {
    this.initContext = initContext;
  }

  public setup() {
    return {
      __legacy: {
        config: this.initContext.config,
        logger: this.initContext.logger,
      },
    };
  }

  public start() {}
  public stop() {}
}

export interface RollupSetup {
  /** @deprecated */
  __legacy: {
    config: PluginInitializerContext['config'];
    logger: PluginInitializerContext['logger'];
  };
}
