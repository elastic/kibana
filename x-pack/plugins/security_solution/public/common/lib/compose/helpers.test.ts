/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InMemoryCache, IntrospectionFragmentMatcher } from 'apollo-cache-inmemory';
import { errorLink, reTryOneTimeOnErrorLink } from '../../containers/errors';
import { getLinks } from './helpers';
import { withClientState } from 'apollo-link-state';
import * as apolloLinkHttp from 'apollo-link-http';
import introspectionQueryResultData from '../../../graphql/introspection.json';

jest.mock('apollo-cache-inmemory');
jest.mock('apollo-link-http');
jest.mock('apollo-link-state');
jest.mock('../../containers/errors');
const mockWithClientState = 'mockWithClientState';
const mockHttpLink = { mockHttpLink: 'mockHttpLink' };

(withClientState as jest.Mock).mockReturnValue(mockWithClientState);
(apolloLinkHttp.createHttpLink as jest.Mock).mockImplementation(() => mockHttpLink);

describe('getLinks helper', () => {
  test('It should return links in correct order', () => {
    const mockCache = new InMemoryCache({
      dataIdFromObject: () => null,
      fragmentMatcher: new IntrospectionFragmentMatcher({
        // @ts-expect-error apollo-cache-inmemory types don't match actual introspection data
        introspectionQueryResultData,
      }),
    });
    const links = getLinks(mockCache, 'basePath');
    expect(links[0]).toEqual(errorLink);
    expect(links[1]).toEqual(reTryOneTimeOnErrorLink);
    expect(links[2]).toEqual(mockWithClientState);
    expect(links[3]).toEqual(mockHttpLink);
  });
});
