/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { DISCOVER_APP_LOCATOR, DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { LogExplorerLocatorDefinition, LogExplorerLocators } from '../common/locators';
import { createLogExplorer } from './components/log_explorer';
import { createLogExplorerControllerLazyFactory } from './controller/lazy_create_controller';
import type {
  LogExplorerPluginSetup,
  LogExplorerPluginStart,
  LogExplorerSetupDeps,
  LogExplorerStartDeps,
} from './types';

export class LogExplorerPlugin implements Plugin<LogExplorerPluginSetup, LogExplorerPluginStart> {
  private locators?: LogExplorerLocators;

  constructor(context: PluginInitializerContext) {}

  public setup(core: CoreSetup, plugins: LogExplorerSetupDeps) {
    const { share } = plugins;
    const discoverAppLocator =
      share.url.locators.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR);

    // Register Locators
    const logExplorerLocator = share.url.locators.create(
      new LogExplorerLocatorDefinition({
        discoverAppLocator,
      })
    );

    this.locators = {
      logExplorerLocator,
    };

    return {
      locators: this.locators,
    };
  }

  public start(core: CoreStart, plugins: LogExplorerStartDeps) {
    const LogExplorer = createLogExplorer({
      core,
      plugins,
    });

    const createLogExplorerController = createLogExplorerControllerLazyFactory({
      core,
      plugins,
    });

    return {
      LogExplorer,
      createLogExplorerController,
    };
  }
}
