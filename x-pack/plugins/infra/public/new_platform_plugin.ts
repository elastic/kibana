/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CoreSetup, CoreStart, PluginInitializerContext } from 'kibana/public';
import { InMemoryCache, IntrospectionFragmentMatcher } from 'apollo-cache-inmemory';
import ApolloClient from 'apollo-client';
import { ApolloLink } from 'apollo-link';
import { HttpLink } from 'apollo-link-http';
import { withClientState } from 'apollo-link-state';
import { startApp } from './apps/start_app';
import { InfraFrontendLibs } from './lib/lib';
import introspectionQueryResultData from './graphql/introspection.json';
import { InfraKibanaObservableApiAdapter } from './lib/adapters/observable_api/kibana_observable_api';
import { registerStartSingleton } from './legacy_singletons';
import { registerFeatures } from './register_feature';
import { HomePublicPluginSetup, HomePublicPluginStart } from '../../../../src/plugins/home/public';
import { DataPublicPluginStart } from '../../../../src/plugins/data/public';

interface ClientPluginsSetup {
  home: HomePublicPluginSetup;
}

interface ClientPluginsStart {
  home: HomePublicPluginStart;
  data: DataPublicPluginStart;
}

export class Plugin {
  constructor(context: PluginInitializerContext) {}

  setup(core: CoreSetup, plugins: ClientPluginsSetup) {
    registerFeatures(plugins.home);
  }

  start(core: CoreStart, plugins: ClientPluginsStart) {
    registerStartSingleton(core);
    startApp(this.composeLibs(core, plugins), core, plugins);
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
