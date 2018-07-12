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
// @ts-ignore: path dynamic for kibana
import { timezoneProvider } from 'ui/vis/lib/timezone';

import { InfraAxiosApiAdapter } from '../adapters/api/axios_api_adapter';
import { InfraKibanaObservableApiAdapter } from '../adapters/observable_api/kibana_observable_api';
import { InfraFieldsDomain } from '../domains/fields_domain';

import { InfraKibanaFrameworkAdapter } from '../adapters/framework/kibana_framework_adapter';
import { InfraFrontendLibs } from '../lib';

import { InMemoryCache } from 'apollo-cache-inmemory';
import ApolloClient from 'apollo-client';
import { ApolloLink } from 'apollo-link';
import { HttpLink } from 'apollo-link-http';
import { withClientState } from 'apollo-link-state';

export function compose(): InfraFrontendLibs {
  const cache = new InMemoryCache();

  const kbnVersion = (window as any).__KBN__.version;

  const api = new InfraAxiosApiAdapter({
    kbnVersion,
  });

  const observableApi = new InfraKibanaObservableApiAdapter({
    basePath: chrome.getBasePath(),
    xsrfToken: chrome.getXsrfToken(),
  });

  const graphQLOptions = {
    cache,
    link: ApolloLink.from([
      withClientState({
        cache,
        resolvers: {
          Mutation: {},
          Query: {},
        },
      }),
      new HttpLink({
        credentials: 'same-origin',
        headers: {
          'kbn-xsrf': chrome.getXsrfToken(),
        },
        uri: `${chrome.getBasePath()}/api/infra/graphql`,
      }),
    ]),
  };

  const apolloClient = new ApolloClient(graphQLOptions);

  const infraModule = uiModules.get('app/infa');

  const framework = new InfraKibanaFrameworkAdapter(infraModule, timezoneProvider);

  const libs: InfraFrontendLibs = {
    api,
    apolloClient,
    fields: new InfraFieldsDomain(api, framework),
    framework,
    observableApi,
  };
  return libs;
}
