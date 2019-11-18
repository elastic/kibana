/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first, map } from 'rxjs/operators';
import { CoreSetup, Logger, PluginInitializerContext, PluginName } from 'kibana/server';
import { ConfigType } from './config';
import { initCaseApi } from './routes/api';

function createConfig$(context: PluginInitializerContext) {
  return context.config.create<ConfigType>().pipe(map(config => config));
}

export class CasePlugin {
  private readonly log: Logger;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.log = this.initializerContext.logger.get();
  }

  public async setup(core: CoreSetup, deps: Record<PluginName, unknown>) {
    const config = await createConfig$(this.initializerContext)
      .pipe(first())
      .toPromise();

    this.log.debug(
      `Setting up Case Workflow with core contract [${Object.keys(core)}] and deps [${Object.keys(
        deps
      )}]`
    );
    if (!config.enabled) {
      return;
    }

    const router = core.http.createRouter();
    initCaseApi({
      caseIndex: config.indexPattern,
      log: this.log,
      router,
    });
  }

  public start() {
    this.log.debug(`Starting Case Workflow`);
  }

  public stop() {
    this.log.debug(`Stopping Case Workflow`);
  }
}
