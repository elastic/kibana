/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';

import { CoreSetup, PluginInitializerContext, Logger } from '../../../../src/core/server';
import { createConfig$, ConfigType } from './config';

export class Plugin {
  readonly name = 'siem';
  private readonly logger: Logger;
  // @ts-ignore-next-line TODO(rylnd): use it or lose it
  private readonly config$: Observable<ConfigType>;

  constructor(context: PluginInitializerContext) {
    const { logger } = context;
    this.logger = logger.get();
    this.logger.debug('plugin initialized');

    this.config$ = createConfig$(context);
  }

  public setup(core: CoreSetup, plugins: {}) {
    this.logger.debug('plugin setup');
  }

  public start() {
    this.logger.debug('plugin started');
  }

  public stop() {
    this.logger.debug('plugin stopped');
  }
}
