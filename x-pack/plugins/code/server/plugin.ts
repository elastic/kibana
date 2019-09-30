/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first } from 'rxjs/operators';
import { TypeOf } from '@kbn/config-schema';
import { LoggerFactory, PluginInitializerContext, RecursiveReadonly } from 'src/core/server';
import { deepFreeze } from '../../../../src/core/utils';
import { CodeConfigSchema } from './config';

/**
 * Describes public Code plugin contract returned at the `setup` stage.
 */
export interface PluginSetupContract {
  legacy: {
    config: TypeOf<typeof CodeConfigSchema>;
    logger: LoggerFactory;
  };
}

/**
 * Represents Timelion Plugin instance that will be managed by the Kibana plugin system.
 */
export class CodePlugin {
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public async setup(): Promise<RecursiveReadonly<PluginSetupContract>> {
    const config = await this.initializerContext.config
      .create<TypeOf<typeof CodeConfigSchema>>()
      .pipe(first())
      .toPromise();

    return deepFreeze({
      legacy: {
        config,
        logger: this.initializerContext.logger,
      },
    });
  }

  public start() {
    this.initializerContext.logger.get().debug('Starting Code plugin');
  }

  public stop() {
    this.initializerContext.logger.get().debug('Stopping Code plugin');
  }
}
