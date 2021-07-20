/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  CoreSetup,
  PluginInitializerContext,
  Plugin,
  Logger,
} from '../../../../src/core/server';
import { schema } from '@kbn/config-schema';
import { PLUGIN } from '../common/constants';
import { License } from './services';
import { EcsMapperPluginDependencies } from './types';
import { registerRoutes } from './routes';

export const config = {
  schema: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
  }),
};

export class EcsMapperServerPlugin implements Plugin {
  private readonly license: License;
  private readonly logger: Logger;

  constructor({ logger }: PluginInitializerContext) {
    this.logger = logger.get();
    this.license = new License();
  }

  setup({ http }: CoreSetup, { licensing }: EcsMapperPluginDependencies) {
    const router = http.createRouter();
    this.license.setup(
      {
        pluginId: PLUGIN.id,
        minimumLicenseType: PLUGIN.minimumLicenseType,
        defaultErrorMessage: i18n.translate('xpack.ecsMapper.licenseCheckErrorMessage', {
          defaultMessage: 'License check failed',
        }),
      },
      {
        licensing,
        logger: this.logger,
      }
    );

    registerRoutes({ router });
  }

  start() {}

  stop() {}
}
