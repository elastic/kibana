/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first } from 'rxjs/operators';
// import { first, take, takeUntil } from 'rxjs/operators';
import { CloudConfigSchema } from './config';
import {
  CoreSetup,
  Logger,
  Plugin,
  PluginInitializerContext,
} from 'src/core/server';

export interface CloudSetup {

}

export class CloudPlugin implements Plugin<CloudSetup> {
  private readonly logger: Logger;
  private readonly config$: Observable<CloudConfigSchema>;

  constructor(private readonly context: PluginInitializerContext) {
    this.logger = this.context.logger.get();
    this.config$ = this.context.config.create<CloudConfigSchema>();
  }

  public async setup(core: CoreSetup) {
    this.logger.debug('Setting up Cloud plugin');
    const config = await this.config$.pipe(first()).toPromise();
    console.log('config::', config);
    return {};
  }

  public start() {}
}
