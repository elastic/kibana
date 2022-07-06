/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { topNElasticSearchQuery } from './topn';
import { ElasticsearchClient, kibanaResponseFactory } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';

const anyQuery = 'any::query';
const index = 'test';
const testAgg = { aggs: { test: {} } };

jest.mock('./query', () => ({
  createProjectTimeQuery: (proj: string, from: string, to: string) => {
    return anyQuery;
  },
  autoHistogramSumCountOnGroupByField: (searchField: string): AggregationsAggregationContainer => {
    return testAgg;
  },
}));

describe('TopN data from Elasticsearch', () => {
  const context = coreMock.createRequestHandlerContext();
  const client = context.elasticsearch.client.asCurrentUser as ElasticsearchClient;
  const logger = loggerMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when fetching Stack Traces', () => {
    it('should search first then skip mget', async () => {
      const response = await topNElasticSearchQuery(
        client,
        logger,
        index,
        '123',
        '456',
        '789',
        200,
        'StackTraceID',
        kibanaResponseFactory
      );

      // Calls to mget are skipped since data doesn't exist
      expect(client.search).toHaveBeenCalledTimes(2);
      expect(client.mget).toHaveBeenCalledTimes(0);

      expect(response.status).toEqual(200);
      expect(response.payload).toHaveProperty('TopN');
      expect(response.payload).toHaveProperty('Metadata');
    });
  });
});
