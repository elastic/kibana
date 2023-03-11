/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricsAPIRequest } from '../../../../common/http_api';
import { queryTotalGroupings } from './query_total_groupings';

describe('queryTotalGroupings', () => {
  const ESSearchClientMock = jest.fn().mockReturnValue({});
  const defaultOptions: MetricsAPIRequest = {
    timerange: {
      from: 1615972672011,
      interval: '>=10s',
      to: 1615976272012,
    },
    indexPattern: 'testIndexPattern',
    metrics: [],
    dropPartialBuckets: true,
    groupBy: ['testField'],
    includeTimeseries: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 0 when there is no groupBy', async () => {
    const { groupBy, ...options } = defaultOptions;

    const response = await queryTotalGroupings(ESSearchClientMock, options);
    expect(response).toBe(0);
  });

  it('should return 0 when there is groupBy is empty', async () => {
    const options = {
      ...defaultOptions,
      groupBy: [],
    };

    const response = await queryTotalGroupings(ESSearchClientMock, options);
    expect(response).toBe(0);
  });

  it('should query ES with a timerange', async () => {
    await queryTotalGroupings(ESSearchClientMock, defaultOptions);

    expect(ESSearchClientMock.mock.calls[0][0].body.query.bool.filter).toContainEqual({
      range: {
        '@timestamp': {
          gte: 1615972672011,
          lte: 1615976272012,
          format: 'epoch_millis',
        },
      },
    });
  });

  it('should query ES with a exist fields', async () => {
    const options = {
      ...defaultOptions,
      groupBy: ['testField1', 'testField2'],
    };

    await queryTotalGroupings(ESSearchClientMock, options);

    expect(ESSearchClientMock.mock.calls[0][0].body.query.bool.filter).toContainEqual({
      exists: { field: 'testField1' },
    });

    expect(ESSearchClientMock.mock.calls[0][0].body.query.bool.filter).toContainEqual({
      exists: { field: 'testField2' },
    });
  });

  it('should query ES with a query filter', async () => {
    const options = {
      ...defaultOptions,
      filters: [
        {
          bool: {
            should: [{ match_phrase: { field1: 'value1' } }],
            minimum_should_match: 1,
          },
        },
      ],
    };

    await queryTotalGroupings(ESSearchClientMock, options);

    expect(ESSearchClientMock.mock.calls[0][0].body.query.bool.filter).toContainEqual({
      bool: {
        should: [
          {
            match_phrase: {
              field1: 'value1',
            },
          },
        ],
        minimum_should_match: 1,
      },
    });
  });

  it('should return 0 when there are no aggregations in the response', async () => {
    const clientMock = jest.fn().mockReturnValue({});

    const response = await queryTotalGroupings(clientMock, defaultOptions);

    expect(response).toBe(0);
  });

  it('should return the value of the aggregation in the response', async () => {
    const clientMock = jest.fn().mockReturnValue({
      aggregations: {
        count: {
          value: 10,
        },
      },
    });

    const response = await queryTotalGroupings(clientMock, defaultOptions);

    expect(response).toBe(10);
  });
});
