/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { SEARCH_INDICES_CREATE_INDEX } from '@kbn/deeplinks-search/constants';
import { i18n } from '@kbn/i18n';

import { docLinks } from '../common/doc_links';
import type {
  AppPluginSetupDependencies,
  SearchIndicesAppPluginStartDependencies,
  SearchIndicesPluginSetup,
  SearchIndicesPluginStart,
  SearchIndicesServicesContextDeps,
} from './types';
import { initQueryClient } from './services/query_client';
import { INDICES_APP_ID, START_APP_ID } from '../common';
import {
  CREATE_INDEX_PATH,
  INDICES_APP_BASE,
  START_APP_BASE,
  SearchIndexDetailsTabValues,
} from './routes';
import { registerLocators } from './locators';

export class SearchIndicesPlugin
  implements Plugin<SearchIndicesPluginSetup, SearchIndicesPluginStart>
{
  private pluginEnabled: boolean = false;

  public setup(
    core: CoreSetup<SearchIndicesAppPluginStartDependencies, SearchIndicesPluginStart>,
    plugins: AppPluginSetupDependencies
  ): SearchIndicesPluginSetup {
    this.pluginEnabled = true;

    const queryClient = initQueryClient(core.notifications.toasts);

    core.application.register({
      id: START_APP_ID,
      appRoute: START_APP_BASE,
      title: i18n.translate('xpack.searchIndices.elasticsearchStart.startAppTitle', {
        defaultMessage: 'Elasticsearch Start',
      }),
      async mount({ element, history }) {
        const { renderApp } = await import('./application');
        const { ElasticsearchStartPage } = await import('./components/start/start_page');
        const [coreStart, depsStart] = await core.getStartServices();
        const startDeps: SearchIndicesServicesContextDeps = {
          ...depsStart,
          history,
        };
        return renderApp(ElasticsearchStartPage, coreStart, startDeps, element, queryClient);
      },
    });
    core.application.register({
      id: INDICES_APP_ID,
      appRoute: INDICES_APP_BASE,
      deepLinks: [
        {
          id: SEARCH_INDICES_CREATE_INDEX,
          path: CREATE_INDEX_PATH,
          title: i18n.translate('xpack.searchIndices.elasticsearchIndices.createIndexTitle', {
            defaultMessage: 'Create index',
          }),
        },
      ],
      title: i18n.translate('xpack.searchIndices.elasticsearchIndices.startAppTitle', {
        defaultMessage: 'Elasticsearch Indices',
      }),
      async mount({ element, history }) {
        const { renderApp } = await import('./application');
        const { SearchIndicesRouter } = await import('./components/indices_router');
        const [coreStart, depsStart] = await core.getStartServices();
        const startDeps: SearchIndicesServicesContextDeps = {
          ...depsStart,
          history,
        };
        return renderApp(SearchIndicesRouter, coreStart, startDeps, element, queryClient);
      },
    });

    registerLocators(plugins.share);

    return {
      enabled: true,
      startAppId: START_APP_ID,
      startRoute: START_APP_BASE,
    };
  }

  public start(
    core: CoreStart,
    deps: SearchIndicesAppPluginStartDependencies
  ): SearchIndicesPluginStart {
    const { indexManagement } = deps;
    docLinks.setDocLinks(core.docLinks.links);
    if (this.pluginEnabled) {
      indexManagement?.extensionsService.setIndexDetailsPageRoute({
        renderRoute: (indexName, detailsTabId) => {
          const route = `/app/elasticsearch/indices/index_details/${indexName}`;
          if (detailsTabId && SearchIndexDetailsTabValues.includes(detailsTabId)) {
            return `${route}/${detailsTabId}`;
          }
          return route;
        },
      });
    }
    return {
      enabled: this.pluginEnabled,
      startAppId: START_APP_ID,
      startRoute: START_APP_BASE,
    };
  }

  public stop() {}
}
