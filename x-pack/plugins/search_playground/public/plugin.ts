/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  Plugin,
  CoreStart,
  AppMountParameters,
  PluginInitializerContext,
} from '@kbn/core/public';
import { PLUGIN_ID, PLUGIN_NAME, PLUGIN_PATH } from '../common';
import { docLinks } from '../common/doc_links';
import { PlaygroundHeaderDocs } from './components/playground_header_docs';
import { Playground, getPlaygroundProvider } from './embeddable';
import type {
  AppPluginSetupDependencies,
  AppPluginStartDependencies,
  SearchPlaygroundConfigType,
  SearchPlaygroundPluginSetup,
  SearchPlaygroundPluginStart,
} from './types';
import { registerLocators } from './locators';

export class SearchPlaygroundPlugin
  implements Plugin<SearchPlaygroundPluginSetup, SearchPlaygroundPluginStart>
{
  private config: SearchPlaygroundConfigType;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<SearchPlaygroundConfigType>();
  }

  public setup(
    core: CoreSetup<AppPluginStartDependencies, SearchPlaygroundPluginStart>,
    deps: AppPluginSetupDependencies
  ): SearchPlaygroundPluginSetup {
    if (!this.config.ui?.enabled) return {};

    core.application.register({
      id: PLUGIN_ID,
      appRoute: PLUGIN_PATH,
      title: PLUGIN_NAME,
      async mount({ element, history }: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart, depsStart] = await core.getStartServices();

        coreStart.chrome.docTitle.change(PLUGIN_NAME);

        const startDeps: AppPluginStartDependencies = {
          ...depsStart,
          history,
        };

        return renderApp(coreStart, startDeps, element);
      },
    });

    registerLocators(deps.share);

    return {};
  }

  public start(core: CoreStart, deps: AppPluginStartDependencies): SearchPlaygroundPluginStart {
    docLinks.setDocLinks(core.docLinks.links);
    return {
      PlaygroundProvider: getPlaygroundProvider(core, deps),
      Playground,
      PlaygroundHeaderDocs,
    };
  }

  public stop() {}
}
