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
import { type ObservabilityLogExplorerConfig } from '../common/plugin_config';
import { logExplorerAppTitle } from '../common/translations';
import { renderObservabilityLogExplorer } from './applications/observability_log_explorer';
import type {
  ObservabilityLogExplorerPluginSetup,
  ObservabilityLogExplorerPluginStart,
  ObservabilityLogExplorerSetupDeps,
  ObservabilityLogExplorerStartDeps,
} from './types';

export class ObservabilityLogExplorerPlugin
  implements Plugin<ObservabilityLogExplorerPluginSetup, ObservabilityLogExplorerPluginStart>
{
  private config: ObservabilityLogExplorerConfig;

  constructor(context: PluginInitializerContext<ObservabilityLogExplorerConfig>) {
    this.config = context.config.get();
  }

  public setup(
    core: CoreSetup<ObservabilityLogExplorerStartDeps, ObservabilityLogExplorerPluginStart>,
    _pluginsSetup: ObservabilityLogExplorerSetupDeps
  ) {
    core.application.register({
      id: 'observability-log-explorer',
      title: logExplorerAppTitle,
      category: DEFAULT_APP_CATEGORIES.observability,
      euiIconType: 'logoLogging',
      navLinkStatus: this.config.navigation.showAppLink
        ? AppNavLinkStatus.visible
        : AppNavLinkStatus.hidden,
      searchable: true,
      mount: async (appMountParams) => {
        const [coreStart, pluginsStart, ownPluginStart] = await core.getStartServices();

        return renderObservabilityLogExplorer(
          coreStart,
          pluginsStart,
          ownPluginStart,
          appMountParams
        );
      },
    });

    return {};
  }

  public start(_core: CoreStart, _pluginsStart: ObservabilityLogExplorerStartDeps) {
    return {};
  }
}
