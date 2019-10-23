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
  IClusterClient,
  LoggerFactory,
  PluginInitializerContext,
  RecursiveReadonly,
} from 'src/core/server';
// import { deepFreeze } from '../../../../src/core/utils';
import { PluginSetupContract as FeaturesSetupContract } from '../../features/server';
import { CodeConfigSchema } from './config';
import { SAVED_OBJ_REPO } from '../../../legacy/plugins/code/common/constants';

/**
 * Describes public Code plugin contract returned at the `setup` stage.
 */
export interface PluginSetupContract {
  /** @deprecated */
  legacy: {
    config: TypeOf<typeof CodeConfigSchema>;
    logger: LoggerFactory;
    http: any;
    elasticsearch: {
      adminClient$: IClusterClient;
    };
  };
}

/**
 * Represents Code Plugin instance that will be managed by the Kibana plugin system.
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
            all: [SAVED_OBJ_REPO],
            read: ['config'],
          },
          ui: ['show', 'user', 'admin'],
        },
        read: {
          api: ['code_user'],
          savedObject: {
            all: [],
            read: ['config', SAVED_OBJ_REPO],
          },
          ui: ['show', 'user'],
        },
      },
    });

    return {
      /** @deprecated */
      legacy: {
        config,
        logger: this.initializerContext.logger,
        http: coreSetup.http,
        elasticsearch: {
          adminClient$: await coreSetup.elasticsearch.adminClient$.pipe(first()).toPromise(),
        },
      },
    };
  }

  public start() {
    this.initializerContext.logger.get().debug('Starting Code plugin');
  }

  public stop() {
    this.initializerContext.logger.get().debug('Stopping Code plugin');
  }
}
