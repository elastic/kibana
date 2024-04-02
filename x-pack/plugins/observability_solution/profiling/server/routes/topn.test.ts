/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import { coreMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { ProfilingESField } from '@kbn/profiling-utils';
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
    profilingStacktraces: jest.fn(
      (request) =>
        context.elasticsearch.client.asCurrentUser.transport.request({
          method: 'POST',
          path: encodeURI('_profiling/stacktraces'),
          body: {
            query: request.query,
            sample_size: request.sampleSize,
          },
        }) as Promise<any>
    ),
    profilingStatus: jest.fn(
      () =>
        context.elasticsearch.client.asCurrentUser.transport.request({
          method: 'GET',
          path: encodeURI('_profiling/status'),
          body: {},
        }) as Promise<any>
    ),
    getEsClient: jest.fn(() => context.elasticsearch.client.asCurrentUser),
    profilingFlamegraph: jest.fn(
      (request) =>
        context.elasticsearch.client.asCurrentUser.transport.request({
          method: 'POST',
          path: encodeURI('_profiling/flamegraph'),
          body: {
            query: request.query,
            sample_size: request.sampleSize,
          },
        }) as Promise<any>
    ),
  };
  const logger = loggerMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when fetching Stack Traces', () => {
    it('should call search twice', async () => {
      await topNElasticSearchQuery({
        client,
        logger,
        timeFrom: 456,
        timeTo: 789,
        searchField: ProfilingESField.StacktraceID,
        highCardinality: false,
        kuery: '',
        showErrorFrames: false,
      });

      expect(client.search).toHaveBeenCalledTimes(2);
    });
  });
});
