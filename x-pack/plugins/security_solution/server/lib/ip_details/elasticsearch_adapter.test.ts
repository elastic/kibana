/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FlowTarget } from '../../graphql/types';

import { getIpOverviewAgg, getIpOverviewHostAgg, getUsersEdges } from './elasticsearch_adapter';

import {
  formattedDestination,
  formattedEmptySource,
  formattedHost,
  formattedSource,
  mockFormattedUsersEdges,
  mockUsersData,
  responseAggs,
} from './mock';

describe('elasticsearch_adapter', () => {
  describe('#getIpOverview', () => {
    test('will return a destination correctly', () => {
      const destination = getIpOverviewAgg(
        FlowTarget.destination,
        responseAggs.aggregations.destination!
      );
      expect(destination).toEqual(formattedDestination);
    });

    test('will return a source correctly', () => {
      const source = getIpOverviewAgg(FlowTarget.source, responseAggs.aggregations.source!);
      expect(source).toEqual(formattedSource);
    });

    test('will return a host correctly', () => {
      const host = getIpOverviewHostAgg(responseAggs.aggregations.host);
      expect(host).toEqual(formattedHost);
    });

    test('will return an empty source correctly', () => {
      const source = getIpOverviewAgg(FlowTarget.source, {});
      expect(source).toEqual(formattedEmptySource);
    });
  });

  describe('#getUsers', () => {
    test('will format edges correctly', () => {
      // @ts-ignore Re-work `DatabaseSearchResponse` types as mock ES Response won't match
      const edges = getUsersEdges(mockUsersData);
      expect(edges).toEqual(mockFormattedUsersEdges);
    });
  });
});
