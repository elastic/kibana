/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InMemoryCache } from 'apollo-cache-inmemory';
import ApolloClient from 'apollo-client';
import { SchemaLink } from 'apollo-link-schema';
import { addMockFunctionsToSchema, makeExecutableSchema } from 'graphql-tools';
import 'ui/autoload/all';
// @ts-ignore: path dynamic for kibana
import chrome from 'ui/chrome';
// @ts-ignore: path dynamic for kibana
import { uiModules } from 'ui/modules';
import uiRoutes from 'ui/routes';
// @ts-ignore: path dynamic for kibana
import { timezoneProvider } from 'ui/vis/lib/timezone';

import { AppKibanaFrameworkAdapter } from '../adapters/framework/kibana_framework_adapter';
import { AppKibanaObservableApiAdapter } from '../adapters/observable_api/kibana_observable_api';
import { AppFrontendLibs } from '../lib';

export function compose(): AppFrontendLibs {
  const appModule = uiModules.get('app/siem');
  const observableApi = new AppKibanaObservableApiAdapter({
    basePath: chrome.getBasePath(),
    xsrfToken: chrome.getXsrfToken(),
  });
  const framework = new AppKibanaFrameworkAdapter(appModule, uiRoutes, timezoneProvider);
  const typeDefs = `
  Query {}
`;

  const mocks = {
    Mutation: () => undefined,
    Query: () => undefined,
  };

  const schema = makeExecutableSchema({ typeDefs });
  addMockFunctionsToSchema({
    mocks,
    schema,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cache = new InMemoryCache((window as any).__APOLLO_CLIENT__);

  const apolloClient = new ApolloClient({
    cache,
    link: new SchemaLink({ schema }),
  });

  const libs: AppFrontendLibs = {
    apolloClient,
    framework,
    observableApi,
  };
  return libs;
}
