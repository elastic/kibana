/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InMemoryCache, IntrospectionFragmentMatcher } from 'apollo-cache-inmemory';
import ApolloClient from 'apollo-client';
import { ApolloLink } from 'apollo-link';

import introspectionQueryResultData from '../../../graphql/introspection.json';
import { AppFrontendLibs } from '../lib';
import { getLinks } from './helpers';
import { CoreStart } from '../../../../../../../src/core/public';

export function composeLibs(core: CoreStart): AppFrontendLibs {
  const cache = new InMemoryCache({
    dataIdFromObject: () => null,
    fragmentMatcher: new IntrospectionFragmentMatcher({
      // @ts-expect-error apollo-cache-inmemory types don't match actual introspection data
      introspectionQueryResultData,
    }),
  });
  const basePath = core.http.basePath.get();

  const apolloClient = new ApolloClient({
    connectToDevTools: process.env.NODE_ENV !== 'production',
    cache,
    link: ApolloLink.from(getLinks(cache, basePath)),
  });

  const libs: AppFrontendLibs = {
    apolloClient,
  };
  return libs;
}
