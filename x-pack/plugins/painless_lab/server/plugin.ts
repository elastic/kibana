/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';

import { PLUGIN } from '../common/constants';
import { registerExecuteRoute } from './routes/api';
import { License } from './services';
import { Dependencies } from './types';

export class PainlessLabServerPlugin implements Plugin {
  private readonly license: License;
  private readonly logger: Logger;

  constructor({ logger }: PluginInitializerContext) {
    this.logger = logger.get();
    this.license = new License();
  }

  setup({ http }: CoreSetup, { licensing }: Dependencies) {
    const router = http.createRouter();

    this.license.setup(
      {
        pluginId: PLUGIN.id,
        minimumLicenseType: PLUGIN.minimumLicenseType,
        defaultErrorMessage: i18n.translate('xpack.painlessLab.licenseCheckErrorMessage', {
          defaultMessage: 'License check failed',
        }),
      },
      {
        licensing,
        logger: this.logger,
      }
    );

    registerExecuteRoute({ router, license: this.license });
  }

  start() {}

  stop() {}
}
