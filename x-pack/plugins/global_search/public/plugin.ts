/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'src/core/public';
import type { ScreenshotModePluginStart } from '../../../../src/plugins/screenshot_mode/public';
import { LicensingPluginStart } from '../../licensing/public';
import { ILicenseChecker, LicenseChecker } from '../common/license_checker';
import { GlobalSearchClientConfigType } from './config';
import { SearchService } from './services';
import { GlobalSearchPluginSetup, GlobalSearchPluginStart } from './types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GlobalSearchPluginSetupDeps {}
export interface GlobalSearchPluginStartDeps {
  licensing: LicensingPluginStart;
  screenshotMode: ScreenshotModePluginStart;
}

export class GlobalSearchPlugin
  implements
    Plugin<
      GlobalSearchPluginSetup,
      GlobalSearchPluginStart,
      GlobalSearchPluginSetupDeps,
      GlobalSearchPluginStartDeps
    >
{
  private readonly config: GlobalSearchClientConfigType;
  private licenseChecker?: ILicenseChecker;
  private readonly searchService = new SearchService();

  constructor(context: PluginInitializerContext) {
    this.config = context.config.get<GlobalSearchClientConfigType>();
  }

  setup(core: CoreSetup<{}, GlobalSearchPluginStart>) {
    const { registerResultProvider } = this.searchService.setup({
      config: this.config,
    });

    return {
      registerResultProvider,
    };
  }

  start({ http }: CoreStart, { licensing, screenshotMode }: GlobalSearchPluginStartDeps) {
    this.licenseChecker = new LicenseChecker(licensing.license$);
    const { find, getSearchableTypes } = this.searchService.start({
      http,
      licenseChecker: this.licenseChecker,
      isScreenshotMode: screenshotMode.isScreenshotMode(),
    });

    return {
      find,
      getSearchableTypes,
    };
  }

  public stop() {
    if (this.licenseChecker) {
      this.licenseChecker.clean();
    }
  }
}
