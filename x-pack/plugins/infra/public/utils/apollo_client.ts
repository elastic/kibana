/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InMemoryCache, IntrospectionFragmentMatcher } from 'apollo-cache-inmemory';
import ApolloClient from 'apollo-client';
import { ApolloLink } from 'apollo-link';
import { createHttpLink } from 'apollo-link-http';
import { withClientState } from 'apollo-link-state';
import { HttpFetchOptions, HttpHandler } from 'src/core/public';
import introspectionQueryResultData from '../graphql/introspection.json';

export const createApolloClient = (fetch: HttpHandler) => {
  const cache = new InMemoryCache({
    addTypename: false,
    fragmentMatcher: new IntrospectionFragmentMatcher({
      introspectionQueryResultData,
    }),
  });

  const wrappedFetch = (path: string, options: HttpFetchOptions) => {
    return new Promise<Response>(async (resolve, reject) => {
      // core.http.fetch isn't 100% compatible with the Fetch API and will
      // throw Errors on 401s. This top level try / catch handles those scenarios.
      try {
        fetch(path, {
          ...options,
          // Set headers to undefined due to this bug: https://github.com/apollographql/apollo-link/issues/249,
          // Apollo will try to set a "content-type" header which will conflict with the "Content-Type" header that
          // core.http.fetch correctly sets.
          headers: undefined,
          asResponse: true,
        }).then((res) => {
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

  return new ApolloClient(graphQLOptions);
};
