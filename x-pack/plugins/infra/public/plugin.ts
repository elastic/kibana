/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { merge } from 'lodash';
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
import { createHttpLink } from 'apollo-link-http';
import { withClientState } from 'apollo-link-state';
import { HttpFetchOptions } from 'src/core/public';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/utils';
import { InfraFrontendLibs } from './lib/lib';
import introspectionQueryResultData from './graphql/introspection.json';
import { InfraKibanaObservableApiAdapter } from './lib/adapters/observable_api/kibana_observable_api';
import { registerStartSingleton } from './legacy_singletons';
import { registerFeatures } from './register_feature';
import { HomePublicPluginSetup, HomePublicPluginStart } from '../../../../src/plugins/home/public';
import { DataPublicPluginSetup, DataPublicPluginStart } from '../../../../src/plugins/data/public';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/public';
import { DataEnhancedSetup, DataEnhancedStart } from '../../data_enhanced/public';
import { LogsRouter, MetricsRouter } from './routers';

export type ClientSetup = void;
export type ClientStart = void;

export interface ClientPluginsSetup {
  home: HomePublicPluginSetup;
  data: DataPublicPluginSetup;
  usageCollection: UsageCollectionSetup;
  dataEnhanced: DataEnhancedSetup;
}

export interface ClientPluginsStart {
  home: HomePublicPluginStart;
  data: DataPublicPluginStart;
  dataEnhanced: DataEnhancedStart;
}

export type InfraPlugins = ClientPluginsSetup & ClientPluginsStart;

const getMergedPlugins = (setup: ClientPluginsSetup, start: ClientPluginsStart): InfraPlugins => {
  return merge({}, setup, start);
};

export class Plugin
  implements PluginClass<ClientSetup, ClientStart, ClientPluginsSetup, ClientPluginsStart> {
  constructor(context: PluginInitializerContext) {}

  setup(core: CoreSetup, pluginsSetup: ClientPluginsSetup) {
    registerFeatures(pluginsSetup.home);

    core.application.register({
      id: 'logs',
      title: i18n.translate('xpack.infra.logs.pluginTitle', {
        defaultMessage: 'Logs',
      }),
      euiIconType: 'logsApp',
      order: 8001,
      appRoute: '/app/logs',
      category: DEFAULT_APP_CATEGORIES.observability,
      mount: async (params: AppMountParameters) => {
        const [coreStart, pluginsStart] = await core.getStartServices();
        const plugins = getMergedPlugins(pluginsSetup, pluginsStart as ClientPluginsStart);
        const { startApp } = await import('./apps/start_app');
        return startApp(
          this.composeLibs(coreStart, plugins),
          coreStart,
          plugins,
          params,
          LogsRouter
        );
      },
    });

    core.application.register({
      id: 'metrics',
      title: i18n.translate('xpack.infra.metrics.pluginTitle', {
        defaultMessage: 'Metrics',
      }),
      euiIconType: 'metricsApp',
      order: 8000,
      appRoute: '/app/metrics',
      category: DEFAULT_APP_CATEGORIES.observability,
      mount: async (params: AppMountParameters) => {
        const [coreStart, pluginsStart] = await core.getStartServices();
        const plugins = getMergedPlugins(pluginsSetup, pluginsStart as ClientPluginsStart);
        const { startApp } = await import('./apps/start_app');
        return startApp(
          this.composeLibs(coreStart, plugins),
          coreStart,
          plugins,
          params,
          MetricsRouter
        );
      },
    });

    /* This exists purely to facilitate URL redirects from the old App ID ("infra"),
    to our new App IDs ("metrics" and "logs"). With version 8.0.0 we can remove this. */
    core.application.register({
      id: 'infra',
      appRoute: '/app/infra',
      title: 'infra',
      navLinkStatus: 3,
      mount: async (params: AppMountParameters) => {
        const { startLegacyApp } = await import('./apps/start_legacy_app');
        return startLegacyApp(params);
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

    const wrappedFetch = (path: string, options: HttpFetchOptions) => {
      return new Promise<Response>(async (resolve, reject) => {
        // core.http.fetch isn't 100% compatible with the Fetch API and will
        // throw Errors on 401s. This top level try / catch handles those scenarios.
        try {
          core.http
            .fetch(path, {
              ...options,
              // Set headers to undefined due to this bug: https://github.com/apollographql/apollo-link/issues/249,
              // Apollo will try to set a "content-type" header which will conflict with the "Content-Type" header that
              // core.http.fetch correctly sets.
              headers: undefined,
              asResponse: true,
            })
            .then(res => {
              if (!res.response) {
                return reject();
              }
              // core.http.fetch will parse the Response and set a body before handing it back. As such .text() / .json()
              // will have already been called on the Response instance. However, Apollo will also want to call
              // .text() / .json() on the instance, as it expects the raw Response instance, rather than core's wrapper.
              // .text() / .json() can only be called once, and an Error will be thrown if those methods are accessed again.
              // This hacks around that by setting up a new .text() method that will restringify the JSON response we already have.
              // This does result in an extra stringify / parse cycle, which isn't ideal, but as we only have a few endpoints left using
              // GraphQL this shouldn't create excessive overhead.
              // Ref: https://github.com/apollographql/apollo-link/blob/master/packages/apollo-link-http/src/httpLink.ts#L134
              // and
              // https://github.com/apollographql/apollo-link/blob/master/packages/apollo-link-http-common/src/index.ts#L125
              return resolve({
                ...res.response,
                text: () => {
                  return new Promise(async (resolveText, rejectText) => {
                    if (res.body) {
                      return resolveText(JSON.stringify(res.body));
                    } else {
                      return rejectText();
                    }
                  });
                },
              });
            });
        } catch (error) {
          reject(error);
        }
      });
    };

    const HttpLink = createHttpLink({
      fetch: wrappedFetch,
      uri: `/api/infra/graphql`,
    });

    const graphQLOptions = {
      cache,
      link: ApolloLink.from([
        withClientState({
          cache,
          resolvers: {},
        }),
        HttpLink,
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
