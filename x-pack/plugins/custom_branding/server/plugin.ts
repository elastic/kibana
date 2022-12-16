/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { License } from '@kbn/license-api-guard-plugin/server';
import { PLUGIN } from '../common/constants';
import { Dependencies } from './types';
import { registerRoutes } from './routes';
import type { CustomBrandingRequestHandlerContext } from './types';

export class CustomBrandingPlugin implements Plugin {
  private readonly license: License;
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.license = new License();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('customBranding: Setup');
    this.license.setup({
      pluginName: PLUGIN.getI18nName(i18n),
      logger: this.logger,
    });
    const router = core.http.createRouter<CustomBrandingRequestHandlerContext>();
    registerRoutes(router);

    return {};
  }

  public start(core: CoreStart, { licensing }: Dependencies) {
    this.logger.debug('customBranding: Started');
    this.license.start({
      pluginId: PLUGIN.ID,
      minimumLicenseType: PLUGIN.MINIMUM_LICENSE_REQUIRED,
      licensing,
    });
    return {};
  }

  public stop() {}
}
