/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AppMountParameters, CoreSetup, Plugin } from '@kbn/core/public';
import type {
  SearchAssistantPluginSetup,
  SearchAssistantPluginStart,
  SearchAssistantPluginStartDependencies,
} from './types';
import { PLUGIN_ID } from '../common';

export class SearchAssistantPlugin
  implements Plugin<SearchAssistantPluginSetup, SearchAssistantPluginStart>
{
  public setup(
    core: CoreSetup<SearchAssistantPluginStartDependencies, SearchAssistantPluginStart>
  ): SearchAssistantPluginSetup {
    core.application.register({
      id: PLUGIN_ID,
      appRoute: '/app/search_assistant',
      title: i18n.translate('xpack.searchAssistant.applicationTitle', {
        defaultMessage: 'Search Assistant',
      }),
      async mount({ element, history }: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart, depsStart] = await core.getStartServices();
        const startDeps: SearchAssistantPluginStartDependencies = {
          ...depsStart,
          history,
        };
        return renderApp(coreStart, startDeps, element);
      },
    });
    return {};
  }

  public start(): SearchAssistantPluginStart {
    return {};
  }

  public stop() {}
}
