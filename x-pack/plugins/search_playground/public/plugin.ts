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
  PluginInitializerContext,
} from '@kbn/core/public';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';
import { docLinks } from '../common/doc_links';
import { PlaygroundToolbar, Playground, getPlaygroundProvider } from './embeddable';
import {
  AppPluginStartDependencies,
  SearchPlaygroundConfigType,
  SearchPlaygroundPluginSetup,
  SearchPlaygroundPluginStart,
} from './types';

export class SearchPlaygroundPlugin
  implements Plugin<SearchPlaygroundPluginSetup, SearchPlaygroundPluginStart>
{
  private config: SearchPlaygroundConfigType;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<SearchPlaygroundConfigType>();
  }

  public setup(core: CoreSetup): SearchPlaygroundPluginSetup {
    if (!this.config.ui?.enabled) return {};

    core.application.register({
      id: PLUGIN_ID,
      appRoute: '/app/search_playground',
      title: PLUGIN_NAME,
      async mount({ element, history }: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart, depsStart] = await core.getStartServices();
        docLinks.setDocLinks(coreStart.docLinks.links);

        return renderApp(
          coreStart,
          {
            history,
            ...depsStart,
          } as AppPluginStartDependencies,
          { element } as AppMountParameters
        );
      },
    });

    return {};
  }

  public start(core: CoreStart, deps: AppPluginStartDependencies): SearchPlaygroundPluginStart {
    return {
      PlaygroundProvider: getPlaygroundProvider(core, deps),
      PlaygroundToolbar,
      Playground,
    };
  }

  public stop() {}
}
