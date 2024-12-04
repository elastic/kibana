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
  PluginInitializerContext,
  AppMountParameters,
} from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { PLUGIN_ID, PLUGIN_NAME, PLUGIN_PATH } from '../common';
import {
  AppPluginSetupDependencies,
  AppPluginStartDependencies,
  SearchSynonymsPluginSetup,
  SearchSynonymsPluginStart,
} from './types';

export class SearchSynonymsPlugin
  implements Plugin<SearchSynonymsPluginSetup, SearchSynonymsPluginStart>
{
  constructor(_: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<AppPluginStartDependencies, SearchSynonymsPluginStart>,
    deps: AppPluginSetupDependencies
  ): SearchSynonymsPluginSetup {
    core.application.register({
      id: PLUGIN_ID,
      appRoute: '/app/elasticsearch/synonyms',
      title: PLUGIN_NAME,
      deepLinks: [
        {
          id: 'synonyms',
          path: PLUGIN_PATH,
          title: i18n.translate('xpack.searchSynonyms.appTitle', {
            defaultMessage: 'Synonyms',
          }),
        },
      ],
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

    return {};
  }

  public start(core: CoreStart, deps: AppPluginStartDependencies): SearchSynonymsPluginStart {
    return {};
  }

  public stop() {}
}
