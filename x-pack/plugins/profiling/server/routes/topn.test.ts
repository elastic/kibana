/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import { coreMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { ProfilingESField } from '../../common/elasticsearch';
import { ProfilingESClient } from '../utils/create_profiling_es_client';
import { topNElasticSearchQuery } from './topn';

const anyQuery = 'any::query';
const smallestInterval = '1s';
const testAgg = { aggs: { test: {} } };

jest.mock('./query', () => ({
  createCommonFilter: ({}: {}) => {
    return anyQuery;
  },
  findFixedIntervalForBucketsPerTimeRange: (from: number, to: number, buckets: number): string => {
    return smallestInterval;
  },
  aggregateByFieldAndTimestamp: (
    searchField: string,
    interval: string
  ): AggregationsAggregationContainer => {
    return testAgg;
  },
}));

describe('TopN data from Elasticsearch', () => {
  const context = coreMock.createRequestHandlerContext();
  const client: ProfilingESClient = {
    search: jest.fn(
      (operationName, request) =>
        context.elasticsearch.client.asCurrentUser.search(request) as Promise<any>
    ),
    mget: jest.fn(
      (operationName, request) =>
        context.elasticsearch.client.asCurrentUser.search(request) as Promise<any>
    ),
  };
  const logger = loggerMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when fetching Stack Traces', () => {
    it('should search first then skip mget', async () => {
      await topNElasticSearchQuery({
        client,
        logger,
        timeFrom: 456,
        timeTo: 789,
        searchField: ProfilingESField.StacktraceID,
        highCardinality: false,
        kuery: '',
      });

      // Calls to mget are skipped since data doesn't exist
      expect(client.search).toHaveBeenCalledTimes(2);
      expect(client.mget).toHaveBeenCalledTimes(0);
    });
  });
});
