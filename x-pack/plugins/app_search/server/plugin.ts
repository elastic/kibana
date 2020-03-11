/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import { Plugin, CoreSetup, PluginInitializerContext } from 'src/core/server';

import { registerEnginesRoute } from './routes/engines';

export interface ServerConfigType {
  host?: string;
}

export class AppSearchPlugin implements Plugin {
  private config: Observable<ServerConfigType>;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.create<ServerConfigType>();
  }

  public async setup({ http }: CoreSetup) {
    const router = http.createRouter();
    const config = await this.config.pipe(first()).toPromise();
    const dependencies = { router, config };

    registerEnginesRoute(dependencies);
  }

  public start() {}

  public stop() {}
}
