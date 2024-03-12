/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoreSetup,
  Plugin,
  CoreStart,
  AppMountParameters,
  DEFAULT_APP_CATEGORIES,
} from '@kbn/core/public';
import { PLUGIN_NAME } from '../common';
import { PlaygroundToolbar, PlaygroundProvider, Playground } from './embedable';
import {
  AppPluginStartDependencies,
  SearchPlaygroundPluginSetup,
  SearchPlaygroundPluginStart,
} from './types';

export class SearchPlaygroundPlugin
  implements Plugin<SearchPlaygroundPluginSetup, SearchPlaygroundPluginStart>
{
  public setup(core: CoreSetup): SearchPlaygroundPluginSetup {
    core.application.register({
      id: 'playground',
      appRoute: '/app/enterprise_search/playground',
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      title: PLUGIN_NAME,
      async mount(params: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart, depsStart] = await core.getStartServices();

        return renderApp(coreStart, depsStart as AppPluginStartDependencies, params);
      },
    });

    return {};
  }

  public start(core: CoreStart, deps: AppPluginStartDependencies): SearchPlaygroundPluginStart {
    return {
      PlaygroundProvider,
      PlaygroundToolbar,
      Playground,
    };
  }

  public stop() {}
}
