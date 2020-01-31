/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import {
  Plugin as PluginClass,
  CoreSetup,
  CoreStart,
  PluginInitializerContext,
  AppMountParameters,
} from 'kibana/public';
import { InMemoryCache, IntrospectionFragmentMatcher } from 'apollo-cache-inmemory';
import ApolloClient from 'apollo-client';
import { ApolloLink } from 'apollo-link';
import { HttpLink } from 'apollo-link-http';
import { withClientState } from 'apollo-link-state';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/utils';
import { InfraFrontendLibs } from './lib/lib';
import introspectionQueryResultData from './graphql/introspection.json';
import { InfraKibanaObservableApiAdapter } from './lib/adapters/observable_api/kibana_observable_api';
import { registerStartSingleton } from './legacy_singletons';
import { registerFeatures } from './register_feature';
import { HomePublicPluginSetup, HomePublicPluginStart } from '../../../../src/plugins/home/public';
import { DataPublicPluginStart, DataPublicPluginSetup } from '../../../../src/plugins/data/public';
// @ts-ignore
import { setupKqlQuerySuggestionProvider } from '../../../legacy/plugins/kuery_autocomplete/public/kql_query_suggestion';

export type ClientSetup = void;
export type ClientStart = void;

export interface ClientPluginsSetup {
  home: HomePublicPluginSetup;
  data: DataPublicPluginSetup;
}

export interface ClientPluginsStart {
  home: HomePublicPluginStart;
  data: DataPublicPluginStart;
}

export class Plugin
  implements PluginClass<ClientSetup, ClientStart, ClientPluginsSetup, ClientPluginsStart> {
  constructor(context: PluginInitializerContext) {}

  setup(core: CoreSetup, plugins: ClientPluginsSetup) {
    registerFeatures(plugins.home);

    const kueryProvider = setupKqlQuerySuggestionProvider(core);
    plugins.data.autocomplete.addQuerySuggestionProvider('kuery', kueryProvider);

    core.application.register({
      id: 'infra:logs',
      title: i18n.translate('xpack.infra.logs.pluginTitle', {
        defaultMessage: 'Logs',
      }),
      euiIconType: 'logsApp',
      order: 8001,
      appRoute: '/app/infra/logs',
      category: DEFAULT_APP_CATEGORIES.observability,
      mount: async (params: AppMountParameters) => {
        const [coreStart, pluginsStart] = await core.getStartServices();
        const { startApp } = await import('./apps/start_app');
        return startApp(
          this.composeLibs(coreStart, pluginsStart as ClientPluginsStart),
          coreStart,
          pluginsStart,
          params
        );
      },
    });

    core.application.register({
      id: 'infra:home',
      title: i18n.translate('xpack.infra.metrics.pluginTitle', {
        defaultMessage: 'Metrics',
      }),
      euiIconType: 'metricsApp',
      order: 8000,
      appRoute: '/app/infra/infrastructure',
      category: DEFAULT_APP_CATEGORIES.observability,
      mount: async (params: AppMountParameters) => {
        const [coreStart, pluginsStart] = await core.getStartServices();
        const { startApp } = await import('./apps/start_app');
        return startApp(
          this.composeLibs(coreStart, pluginsStart as ClientPluginsStart),
          coreStart,
          pluginsStart,
          params
        );
      },
    });
  }

  start(core: CoreStart, plugins: ClientPluginsStart) {
    registerStartSingleton(core);
  }

  composeLibs(core: CoreStart, plugins: ClientPluginsStart) {
    const cache = new InMemoryCache({
      addTypename: false,
      fragmentMatcher: new IntrospectionFragmentMatcher({
        introspectionQueryResultData,
      }),
    });

    const observableApi = new InfraKibanaObservableApiAdapter({
      basePath: core.http.basePath.get(),
    });

    const graphQLOptions = {
      cache,
      link: ApolloLink.from([
        withClientState({
          cache,
          resolvers: {},
        }),
        new HttpLink({
          credentials: 'same-origin',
          headers: {
            'kbn-xsrf': true,
          },
          uri: `${core.http.basePath.get()}/api/infra/graphql`,
        }),
      ]),
    };

    const apolloClient = new ApolloClient(graphQLOptions);

    const libs: InfraFrontendLibs = {
      apolloClient,
      observableApi,
    };
    return libs;
  }
}
