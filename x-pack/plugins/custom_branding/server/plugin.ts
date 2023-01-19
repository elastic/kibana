/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreSetup,
  CoreStart,
  IUiSettingsClient,
  KibanaRequest,
  Logger,
  Plugin,
  PluginInitializerContext,
  SECURITY_EXTENSION_ID,
} from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { License } from '@kbn/license-api-guard-plugin/server';
import { CustomBranding } from '@kbn/core-custom-branding-common';
import { PLUGIN } from '../common/constants';
import type { CustomBrandingRequestHandlerContext } from './types';
import { Dependencies } from './types';
import { registerRoutes } from './routes';

const settingsKeys: Array<keyof CustomBranding> = [
  'logo',
  'customizedLogo',
  'faviconPNG',
  'faviconSVG',
  'pageTitle',
];

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

    const fetchFn = async (
      request: KibanaRequest,
      unathenticated?: boolean
    ): Promise<CustomBranding> => {
      const [coreStart] = await core.getStartServices();
      const soClient = unathenticated
        ? coreStart.savedObjects.getScopedClient(request, {
            excludedExtensions: [SECURITY_EXTENSION_ID],
          })
        : coreStart.savedObjects.getScopedClient(request);
      const uiSettings = coreStart.uiSettings.globalAsScopedToClient(soClient);
      return await this.getBrandingFrom(uiSettings);
    };

    core.customBranding.register(fetchFn);

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

  private getBrandingFrom = async (uiSettingsClient: IUiSettingsClient) => {
    const branding: CustomBranding = {};
    for (let i = 0; i < settingsKeys!.length; i++) {
      const key = settingsKeys[i];
      const fullKey = `customBranding:${key}`;
      const value = await uiSettingsClient.get(fullKey);
      if (value) {
        branding[key] = value;
      }
    }
    return branding;
  };
}
