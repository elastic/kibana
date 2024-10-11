/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_APP_CATEGORIES,
  type CoreSetup,
  type Plugin,
  CoreStart,
  AppMountParameters,
  PluginInitializerContext,
} from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type {
  SearchAssistantPluginSetup,
  SearchAssistantPluginStart,
  SearchAssistantPluginStartDependencies,
} from './types';

export interface PublicConfigType {
  ui: {
    enabled: boolean;
  };
}

export class SearchAssistantPlugin
  implements
    Plugin<
      SearchAssistantPluginSetup,
      SearchAssistantPluginStart,
      {},
      SearchAssistantPluginStartDependencies
    >
{
  private readonly config: PublicConfigType;

  constructor(private readonly context: PluginInitializerContext) {
    this.config = this.context.config.get();
  }

  public setup(
    core: CoreSetup<SearchAssistantPluginStartDependencies, SearchAssistantPluginStart>
  ): SearchAssistantPluginSetup {
    if (!this.config.ui.enabled) {
      return {};
    }

    core.application.register({
      id: 'searchAssistant',
      title: i18n.translate('xpack.searchAssistant.appTitle', {
        defaultMessage: 'Search Assistant',
      }),
      euiIconType: 'logoEnterpriseSearch',
      appRoute: '/app/searchAssistant',
      category: DEFAULT_APP_CATEGORIES.search,
      visibleIn: [],
      deepLinks: [],
      mount: async (appMountParameters: AppMountParameters<unknown>) => {
        // Load application bundle and Get start services
        const [{ renderApp }, [coreStart, pluginsStart]] = await Promise.all([
          import('./application'),
          core.getStartServices() as Promise<
            [CoreStart, SearchAssistantPluginStartDependencies, unknown]
          >,
        ]);

        return renderApp(coreStart, pluginsStart, appMountParameters);
      },
    });
    return {};
  }

  public start(): SearchAssistantPluginStart {
    return {};
  }

  public stop() {}
}
