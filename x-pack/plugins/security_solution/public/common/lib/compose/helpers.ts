/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createHttpLink } from 'apollo-link-http';
import { withClientState } from 'apollo-link-state';
import { InMemoryCache } from 'apollo-cache-inmemory';

import { errorLink, reTryOneTimeOnErrorLink } from '../../containers/errors';

export const getLinks = (cache: InMemoryCache, basePath: string) => [
  errorLink,
  reTryOneTimeOnErrorLink,
  withClientState({
    cache,
    resolvers: {},
  }),
  createHttpLink({
    credentials: 'same-origin',
    headers: { 'kbn-xsrf': 'true' },
    uri: `${basePath}/api/solutions/security/graphql`,
  }),
];
