/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import { CoreSetup, Logger, Plugin, PluginInitializerContext } from 'src/core/server';
import { ConfigType, createConfig$ } from './config';

export interface PluginsSetup {
  /** @deprecated */
  __legacy: {
    config$: Observable<ConfigType>;
  };
}

export class ReportingPlugin implements Plugin<PluginsSetup> {
  private readonly log: Logger;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.log = this.initializerContext.logger.get();
  }

  public async setup(core: CoreSetup): Promise<PluginsSetup> {
    return {
      __legacy: {
        config$: createConfig$(core, this.initializerContext, this.log).pipe(first()),
      },
    };
  }

  public start() {}
  public stop() {}
}

export { ConfigType };
