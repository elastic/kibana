/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { License } from '@kbn/license-api-guard-plugin/server';
import { Logger } from '@kbn/logging';
import { Dependencies } from './types';
import { PLUGIN } from './constants';

export class CustomBrandingPlugin implements Plugin {
  private readonly license: License;
  private readonly logger: Logger;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
    this.license = new License();
  }

  setup({ getStartServices, notifications, http, uiSettings }: CoreSetup) {
    this.license.setup({
      pluginName: PLUGIN.getI18nName(i18n),
      logger: this.logger,
    });
    return {};
  }

  start(core: CoreStart, { licensing }: Dependencies) {
    const { chrome } = core;
    this.license.start({
      pluginId: PLUGIN.ID,
      minimumLicenseType: PLUGIN.MINIMUM_LICENSE_REQUIRED,
      licensing,
    });
    chrome.registerCustomBrandingPlugin(PLUGIN.ID);

    return {};
  }
}
