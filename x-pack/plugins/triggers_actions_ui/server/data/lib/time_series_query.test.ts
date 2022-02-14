/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// test error conditions of calling timeSeriesQuery - postive results tested in FT

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { loggingSystemMock } from '../../../../../../src/core/server/mocks';
import { Logger } from '../../../../../../src/core/server';
import { TimeSeriesQuery, timeSeriesQuery, getResultFromEs } from './time_series_query';
import { alertsMock } from '../../../../alerting/server/mocks';

const DefaultQueryParams: TimeSeriesQuery = {
  index: 'index-name',
  timeField: 'time-field',
  aggType: 'count',
  aggField: undefined,
  timeWindowSize: 5,
  timeWindowUnit: 'm',
  dateStart: undefined,
  dateEnd: undefined,
  interval: undefined,
  groupBy: 'all',
  termField: undefined,
  termSize: undefined,
};

describe('timeSeriesQuery', () => {
  const esClient = alertsMock.createAlertServices().scopedClusterClient.asCurrentUser;
  const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
  const params = {
    logger,
    esClient,
    query: DefaultQueryParams,
  };

  it('fails as expected when the callCluster call fails', async () => {
    esClient.search.mockRejectedValue(new Error('woopsie'));
    await timeSeriesQuery(params);
    expect(logger.warn.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "indexThreshold timeSeriesQuery: callCluster error: woopsie",
      ]
    `);
  });

  it('fails as expected when the query params are invalid', async () => {
    params.query = { ...params.query, dateStart: 'x' };
    expect(timeSeriesQuery(params)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"invalid date format for dateStart: \\"x\\""`
    );
  });
});

describe('getResultFromEs', () => {
  it('correctly parses time series results for count aggregation', () => {
    expect(
      getResultFromEs(true, false, {
        took: 0,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
        aggregations: {
          dateAgg: {
            buckets: [
              {
                key: '2021-04-22T15:14:31.075Z-2021-04-22T15:19:31.075Z',
                from: 1619104471075,
                from_as_string: '2021-04-22T15:14:31.075Z',
                to: 1619104771075,
                to_as_string: '2021-04-22T15:19:31.075Z',
                doc_count: 0,
              },
            ],
          },
        },
      } as estypes.SearchResponse<unknown>)
    ).toEqual({
      results: [
        {
          group: 'all documents',
          metrics: [['2021-04-22T15:19:31.075Z', 0]],
        },
      ],
    });
  });

  it('correctly parses time series results with no aggregation data for count aggregation', () => {
    // this could happen with cross cluster searches when cluster permissions are incorrect
    // the query completes but doesn't return any aggregations
    expect(
      getResultFromEs(true, false, {
        took: 0,
        timed_out: false,
        _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
        _clusters: { total: 1, successful: 1, skipped: 0 },
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
      } as estypes.SearchResponse<unknown>)
    ).toEqual({
      results: [],
    });
  });

  it('correctly parses time series results for group aggregation', () => {
    expect(
      getResultFromEs(false, true, {
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 298, relation: 'eq' }, hits: [] },
        aggregations: {
          groupAgg: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'host-2',
                doc_count: 149,
                sortValueAgg: { value: 0.5000000018251423 },
                dateAgg: {
                  buckets: [
                    {
                      key: '2021-04-22T15:18:43.191Z-2021-04-22T15:23:43.191Z',
                      from: 1619104723191,
                      from_as_string: '2021-04-22T15:18:43.191Z',
                      to: 1619105023191,
                      to_as_string: '2021-04-22T15:23:43.191Z',
                      doc_count: 149,
                      metricAgg: { value: 0.5000000018251423 },
                    },
                  ],
                },
              },
              {
                key: 'host-1',
                doc_count: 149,
                sortValueAgg: { value: 0.5000000011000857 },
                dateAgg: {
                  buckets: [
                    {
                      key: '2021-04-22T15:18:43.191Z-2021-04-22T15:23:43.191Z',
                      from: 1619104723191,
                      from_as_string: '2021-04-22T15:18:43.191Z',
                      to: 1619105023191,
                      to_as_string: '2021-04-22T15:23:43.191Z',
                      doc_count: 149,
                      metricAgg: { value: 0.5000000011000857 },
                    },
                  ],
                },
              },
            ],
          },
        },
      } as estypes.SearchResponse<unknown>)
    ).toEqual({
      results: [
        {
          group: 'host-2',
          metrics: [['2021-04-22T15:23:43.191Z', 0.5000000018251423]],
        },
        {
          group: 'host-1',
          metrics: [['2021-04-22T15:23:43.191Z', 0.5000000011000857]],
        },
      ],
    });
  });

  it('correctly parses time series results with no aggregation data for group aggregation', () => {
    // this could happen with cross cluster searches when cluster permissions are incorrect
    // the query completes but doesn't return any aggregations
    expect(
      getResultFromEs(false, true, {
        took: 0,
        timed_out: false,
        _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
        _clusters: { total: 1, successful: 1, skipped: 0 },
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
      } as estypes.SearchResponse<unknown>)
    ).toEqual({
      results: [],
    });
  });
});
