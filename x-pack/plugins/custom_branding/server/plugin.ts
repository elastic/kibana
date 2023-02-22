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
import { Subscription } from 'rxjs';
import { PLUGIN } from '../common/constants';
import { Dependencies } from './types';
import { registerUiSettings } from './ui_settings';

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
  private licensingSubscription?: Subscription;
  private isValidLicense: boolean = false;

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

    registerUiSettings(core);

    const fetchFn = async (
      request: KibanaRequest,
      unauthenticated: boolean
    ): Promise<CustomBranding> => {
      if (!this.isValidLicense) {
        return {};
      }
      const [coreStart] = await core.getStartServices();
      const soClient = unauthenticated
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
    this.licensingSubscription = licensing.license$.subscribe((next) => {
      this.isValidLicense = next.hasAtLeast('enterprise');
    });
    return {};
  }

  public stop() {
    this.licensingSubscription?.unsubscribe();
  }

  private getBrandingFrom = async (uiSettingsClient: IUiSettingsClient) => {
    const branding: CustomBranding = {};
    for (let i = 0; i < settingsKeys!.length; i++) {
      const key = settingsKeys[i];
      const fullKey = `xpackCustomBranding:${key}`;
      const value = await uiSettingsClient.get(fullKey);
      this.logger.info(`Fetching custom branding key ${fullKey} with value ${value}`);
      if (value) {
        branding[key] = value;
      }
    }
    return branding;
  };
}
