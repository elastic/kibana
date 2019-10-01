/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { first } from 'rxjs/operators';
import { TypeOf } from '@kbn/config-schema';
import {
  CoreSetup,
  LoggerFactory,
  PluginInitializerContext,
  RecursiveReadonly,
} from 'src/core/server';
import { deepFreeze } from '../../../../src/core/utils';
import { PluginSetupContract as FeaturesSetupContract } from '../../features/server';
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

  public async setup(
    coreSetup: CoreSetup,
    { features }: { features: FeaturesSetupContract }
  ): Promise<RecursiveReadonly<PluginSetupContract>> {
    const config = await this.initializerContext.config
      .create<TypeOf<typeof CodeConfigSchema>>()
      .pipe(first())
      .toPromise();

    features.registerFeature({
      id: 'code',
      name: i18n.translate('xpack.code.featureRegistry.codeFeatureName', {
        defaultMessage: 'Code',
      }),
      icon: 'codeApp',
      navLinkId: 'code',
      app: ['code', 'kibana'],
      catalogue: [], // TODO add catalogue here
      privileges: {
        all: {
          excludeFromBasePrivileges: true,
          api: ['code_user', 'code_admin'],
          savedObject: {
            all: [],
            read: ['config'],
          },
          ui: ['show', 'user', 'admin'],
        },
        read: {
          api: ['code_user'],
          savedObject: {
            all: [],
            read: ['config'],
          },
          ui: ['show', 'user'],
        },
      },
    });

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
