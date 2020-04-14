/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first, map } from 'rxjs/operators';
import { Logger, PluginInitializerContext } from 'kibana/server';
import { CoreSetup } from 'src/core/server';
import { Observable } from 'rxjs';

import { SecurityPluginSetup } from '../../security/server';

import { ConfigType } from './config';
import { initRoutes } from './routes/init_routes';

const createConfig$ = (
  context: PluginInitializerContext
): Observable<Readonly<{
  enabled: boolean;
  listsIndex: string;
  listsItemsIndex: string;
}>> => {
  return context.config.create<ConfigType>().pipe(map(config => config));
};

export interface PluginsSetup {
  security: SecurityPluginSetup;
}

export class ListsPlugin {
  private readonly log: Logger;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.log = this.initializerContext.logger.get();
  }

  public async setup(core: CoreSetup): Promise<void> {
    const config = await createConfig$(this.initializerContext)
      .pipe(first())
      .toPromise();

    if (!config.enabled) {
      return;
    }

    const router = core.http.createRouter();
    initRoutes(router, config);
  }

  public start(): void {
    this.log.debug(`Starting plugin`);
  }

  public stop(): void {
    this.log.debug(`Stopping plugin`);
  }
}
