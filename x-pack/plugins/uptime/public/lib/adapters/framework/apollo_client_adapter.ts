/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InMemoryCache } from 'apollo-cache-inmemory';
import { ApolloClient } from 'apollo-client';
import { HttpLink } from 'apollo-link-http';
import { CreateGraphQLClient } from './framework_adapter_types';

export const createApolloClient: CreateGraphQLClient = (uri: string, xsrfHeader: string) =>
  new ApolloClient({
    link: new HttpLink({ uri, credentials: 'same-origin', headers: { 'kbn-xsrf': xsrfHeader } }),
    cache: new InMemoryCache({ dataIdFromObject: () => undefined }),
  });
