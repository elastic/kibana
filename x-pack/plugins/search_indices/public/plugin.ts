/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type {
  SearchIndicesAppPluginStartDependencies,
  SearchIndicesPluginSetup,
  SearchIndicesPluginStart,
  SearchIndicesServicesContext,
} from './types';

export class SearchIndicesPlugin
  implements Plugin<SearchIndicesPluginSetup, SearchIndicesPluginStart>
{
  public setup(
    core: CoreSetup<SearchIndicesAppPluginStartDependencies, SearchIndicesPluginStart>
  ): SearchIndicesPluginSetup {
    core.application.register({
      id: 'elasticsearchStart',
      appRoute: '/app/elasticsearch/start',
      title: i18n.translate('xpack.searchIndices.startAppTitle', {
        defaultMessage: 'Elasticsearch Start',
      }),
      async mount({ element, history }) {
        const { renderApp } = await import('./application');
        const { ElasticsearchStartPage } = await import('./components/start/start_page');
        const [coreStart, depsStart] = await core.getStartServices();
        const startDeps: Partial<SearchIndicesServicesContext> = {
          ...depsStart,
          history,
        };
        return renderApp(ElasticsearchStartPage, coreStart, startDeps, element);
      },
    });

    return {
      enabled: true,
    };
  }

  public start(core: CoreStart): SearchIndicesPluginStart {
    return {};
  }

  public stop() {}
}
