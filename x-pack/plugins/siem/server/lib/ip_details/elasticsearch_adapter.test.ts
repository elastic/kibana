/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FlowTarget } from '../../graphql/types';

import { formatDomainsEdges, getIpOverviewAgg, getUsersEdges } from './elasticsearch_adapter';

import {
  formattedDestination,
  formattedEmptySource,
  formattedSource,
  mockDomainsResponseBuckets,
  mockFormattedDestination,
  mockFormattedSource,
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
      const destination = getIpOverviewAgg(FlowTarget.source, responseAggs.aggregations.source!);
      expect(destination).toEqual(formattedSource);
    });

    test('will return an empty source correctly', () => {
      const destination = getIpOverviewAgg(FlowTarget.source, {});
      expect(destination).toEqual(formattedEmptySource);
    });
  });

  describe('#getDomains', () => {
    test('will return a source correctly', () => {
      const destination = formatDomainsEdges(mockDomainsResponseBuckets, FlowTarget.source);
      expect(destination).toEqual(mockFormattedSource);
    });

    test('will return a destination correctly', () => {
      const destination = formatDomainsEdges(mockDomainsResponseBuckets, FlowTarget.destination);
      expect(destination).toEqual(mockFormattedDestination);
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
