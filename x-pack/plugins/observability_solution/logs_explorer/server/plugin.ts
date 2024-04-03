/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup } from '@kbn/core/server';
import { DISCOVER_APP_LOCATOR, DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { LogsExplorerLocatorDefinition, LogsExplorerLocators } from '../common/locators';
import { uiSettings } from '../common/ui_settings';
import type { LogsExplorerSetupDeps } from './types';

export class LogsExplorerServerPlugin implements Plugin {
  private locators?: LogsExplorerLocators;

  setup(core: CoreSetup, plugins: LogsExplorerSetupDeps) {
    const { share } = plugins;

    core.uiSettings.register(uiSettings);

    const discoverAppLocator =
      share.url.locators.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR);

    // Register Locators
    const logsExplorerLocator = share.url.locators.create(
      new LogsExplorerLocatorDefinition({
        discoverAppLocator,
      })
    );

    this.locators = {
      logsExplorerLocator,
    };

    return {
      locators: this.locators,
    };
  }

  start() {}
}
