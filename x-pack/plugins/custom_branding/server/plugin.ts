/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { License } from '@kbn/license-api-guard-plugin/server';
import { CustomBrandingRequestHandlerContext, Dependencies } from './types';
import { registerRoutes } from './routes';
import { PLUGIN } from '../common/constants';

export class CustomBrandingPlugin implements Plugin {
  private readonly license: License;
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.license = new License();
  }

  public setup(core: CoreSetup, initializerContext: PluginInitializerContext) {
    this.license.setup({
      pluginName: PLUGIN.getI18nName(i18n),
      logger: this.logger,
    });
    const router = core.http.createRouter<CustomBrandingRequestHandlerContext>();
    registerRoutes(router);
    return {};
  }

  public start(core: CoreStart, { licensing }: Dependencies) {
    this.license.start({
      pluginId: PLUGIN.ID,
      minimumLicenseType: PLUGIN.MINIMUM_LICENSE_REQUIRED,
      licensing,
    });
    return {};
  }

  public stop() {}
}

export { CustomBrandingPlugin as Plugin };
