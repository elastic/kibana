/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'ui/autoload/all';
// @ts-ignore: path dynamic for kibana
import chrome from 'ui/chrome';
// @ts-ignore: path dynamic for kibana
import { uiModules } from 'ui/modules';
import uiRoutes from 'ui/routes';
// @ts-ignore: path dynamic for kibana
import { timezoneProvider } from 'ui/vis/lib/timezone';

import { AppKibanaObservableApiAdapter } from '../adapters/observable_api/kibana_observable_api';

import introspectionQueryResultData from '../../../common/graphql/introspection.json';
import { AppKibanaFrameworkAdapter } from '../adapters/framework/kibana_framework_adapter';
import { AppFrontendLibs } from '../lib';

import { InMemoryCache, IntrospectionFragmentMatcher } from 'apollo-cache-inmemory';
import ApolloClient from 'apollo-client';
import { ApolloLink } from 'apollo-link';
import { HttpLink } from 'apollo-link-http';
import { withClientState } from 'apollo-link-state';

export function compose(): AppFrontendLibs {
  const cache = new InMemoryCache({
    fragmentMatcher: new IntrospectionFragmentMatcher({
      introspectionQueryResultData,
    }),
  });

  const observableApi = new AppKibanaObservableApiAdapter({
    basePath: chrome.getBasePath(),
    xsrfToken: chrome.getXsrfToken(),
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
          'kbn-xsrf': chrome.getXsrfToken(),
        },
        uri: `${chrome.getBasePath()}/api/secops/graphql`,
      }),
    ]),
  };

  const apolloClient = new ApolloClient(graphQLOptions);

  const infraModule = uiModules.get('app/secops');

  const framework = new AppKibanaFrameworkAdapter(infraModule, uiRoutes, timezoneProvider);

  const libs: AppFrontendLibs = {
    apolloClient,
    framework,
    observableApi,
  };
  return libs;
}
