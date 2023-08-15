/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { LOG_EXPLORER_PROFILE_ID } from '../common/constants';
import { DiscoverLogExplorerLocators, SingleDatasetLocatorDefinition } from '../common/locators';
import { DiscoverLogExplorerConfig } from '../common/plugin_config';
import { createLogExplorerProfileCustomizations } from './customizations/log_explorer_profile';
import { getLogExplorerDeepLink } from './deep_links';
import { DatasetsService, DatasetsServiceSetup } from './services/datasets';
import {
  DiscoverLogExplorerPluginSetup,
  DiscoverLogExplorerPluginStart,
  DiscoverLogExplorerSetupDeps,
  DiscoverLogExplorerStartDeps,
} from './types';

export class DiscoverLogExplorerPlugin
  implements Plugin<DiscoverLogExplorerPluginSetup, DiscoverLogExplorerPluginStart>
{
  private config: DiscoverLogExplorerConfig;
  private locators?: DiscoverLogExplorerLocators;
  private datasetsService: DatasetsService;
  private datasetsClient?: DatasetsServiceSetup['client'];

  constructor(context: PluginInitializerContext<DiscoverLogExplorerConfig>) {
    this.config = context.config.get();
    this.datasetsService = new DatasetsService();
  }

  public setup(core: CoreSetup, plugins: DiscoverLogExplorerSetupDeps) {
    const { share, discover } = plugins;

    this.datasetsClient = this.datasetsService.setup({
      http: core.http,
    }).client;

    const singleDatasetLocator = share.url.locators.create(
      new SingleDatasetLocatorDefinition({ discover, datasetsClient: this.datasetsClient })
    );

    this.locators = {
      singleDatasetLocator,
    };

    return {
      locators: this.locators,
    };
  }

  public start(core: CoreStart, plugins: DiscoverLogExplorerStartDeps) {
    const { discover, data } = plugins;

    discover.registerCustomizationProfile(LOG_EXPLORER_PROFILE_ID, {
      customize: createLogExplorerProfileCustomizations({
        core,
        data,
        datasetsClient: this.datasetsClient!,
      }),
      deepLinks: [getLogExplorerDeepLink({ isVisible: this.config.featureFlags.deepLinkVisible })],
    });
  }
}
