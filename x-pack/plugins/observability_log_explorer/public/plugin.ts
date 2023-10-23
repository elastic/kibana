/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AppNavLinkStatus,
  CoreSetup,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import {
  ObservabilityLogExplorerLocators,
  SingleDatasetLocatorDefinition,
  AllDatasetsLocatorDefinition,
} from '../common/locators';
import { type ObservabilityLogExplorerConfig } from '../common/plugin_config';
import { OBSERVABILITY_LOG_EXPLORER_APP_ID } from '../common/constants';
import { logExplorerAppTitle } from '../common/translations';
import { renderObservabilityLogExplorer } from './applications/observability_log_explorer';
import type {
  ObservabilityLogExplorerAppMountParameters,
  ObservabilityLogExplorerPluginSetup,
  ObservabilityLogExplorerPluginStart,
  ObservabilityLogExplorerSetupDeps,
  ObservabilityLogExplorerStartDeps,
} from './types';

export class ObservabilityLogExplorerPlugin
  implements Plugin<ObservabilityLogExplorerPluginSetup, ObservabilityLogExplorerPluginStart>
{
  private config: ObservabilityLogExplorerConfig;
  private locators?: ObservabilityLogExplorerLocators;

  constructor(context: PluginInitializerContext<ObservabilityLogExplorerConfig>) {
    this.config = context.config.get();
  }

  public setup(
    core: CoreSetup<ObservabilityLogExplorerStartDeps, ObservabilityLogExplorerPluginStart>,
    _pluginsSetup: ObservabilityLogExplorerSetupDeps
  ) {
    const { share } = _pluginsSetup;
    const useHash = core.uiSettings.get('state:storeInSessionStorage');

    core.application.register({
      id: OBSERVABILITY_LOG_EXPLORER_APP_ID,
      title: logExplorerAppTitle,
      category: DEFAULT_APP_CATEGORIES.observability,
      euiIconType: 'logoLogging',
      navLinkStatus: this.config.navigation.showAppLink
        ? AppNavLinkStatus.visible
        : AppNavLinkStatus.hidden,
      searchable: true,
      keywords: ['logs', 'log', 'explorer', 'logs explorer'],
      mount: async (appMountParams: ObservabilityLogExplorerAppMountParameters) => {
        const [coreStart, pluginsStart, ownPluginStart] = await core.getStartServices();

        return renderObservabilityLogExplorer(
          coreStart,
          pluginsStart,
          ownPluginStart,
          appMountParams
        );
      },
    });

    // Register Locators
    const singleDatasetLocator = share.url.locators.create(
      new SingleDatasetLocatorDefinition({
        useHash,
      })
    );
    const allDatasetsLocator = share.url.locators.create(
      new AllDatasetsLocatorDefinition({
        useHash,
      })
    );

    this.locators = {
      singleDatasetLocator,
      allDatasetsLocator,
    };

    return {
      locators: this.locators,
    };
  }

  public start(_core: CoreStart, _pluginsStart: ObservabilityLogExplorerStartDeps) {
    return {};
  }
}
