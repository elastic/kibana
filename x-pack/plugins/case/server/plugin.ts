/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first, map } from 'rxjs/operators';
import { CoreSetup, Logger, PluginInitializerContext } from 'kibana/server';
import { ConfigType } from './config';
import { initCaseApi } from './routes/api';
import { CaseService } from './services';
import { PluginSetupContract as SecurityPluginSetup } from '../../security/server';

function createConfig$(context: PluginInitializerContext) {
  return context.config.create<ConfigType>().pipe(map(config => config));
}

export interface PluginsSetup {
  security: SecurityPluginSetup;
}

export class CasePlugin {
  private readonly log: Logger;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.log = this.initializerContext.logger.get();
  }

  public async setup(core: CoreSetup, plugins: PluginsSetup) {
    const config = await createConfig$(this.initializerContext)
      .pipe(first())
      .toPromise();

    if (!config.enabled) {
      return;
    }
    const service = new CaseService(this.log);

    this.log.debug(
      `Setting up Case Workflow with core contract [${Object.keys(
        core
      )}] and plugins [${Object.keys(plugins)}]`
    );

    const caseService = await service.setup({
      authentication: plugins.security.authc,
    });

    const router = core.http.createRouter();
    initCaseApi({
      caseService,
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
