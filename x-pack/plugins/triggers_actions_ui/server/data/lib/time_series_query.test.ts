/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { Logger } from '@kbn/core/server';
import { TimeSeriesQuery, timeSeriesQuery, getResultFromEs } from './time_series_query';
import { alertsMock } from '@kbn/alerting-plugin/server/mocks';

const DefaultQueryParams: TimeSeriesQuery = {
  index: 'index-name',
  timeField: 'time-field',
  aggType: 'count',
  aggField: undefined,
  timeWindowSize: 5,
  timeWindowUnit: 'm',
  dateStart: '2021-04-22T15:19:31Z',
  dateEnd: '2021-04-22T15:20:31Z',
  interval: '1m',
  groupBy: 'all',
  termField: undefined,
  termSize: undefined,
};

describe('timeSeriesQuery', () => {
  const esClient = alertsMock.createRuleExecutorServices().scopedClusterClient.asCurrentUser;
  const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
  const params = {
    logger,
    esClient,
    query: DefaultQueryParams,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

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
    expect(
      timeSeriesQuery({ ...params, query: { ...params.query, dateStart: 'x' } })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"invalid date format for dateStart: \\"x\\""`);
  });

  it('filters the results when filter param is passed', async () => {
    await timeSeriesQuery({
      ...params,
      query: { ...params.query, filterKuery: 'event.provider: alerting' },
    });
    // @ts-ignore
    expect(esClient.search.mock.calls[0]![0].body.query.bool.filter[1]).toEqual({
      bool: {
        minimum_should_match: 1,
        should: [
          {
            match: {
              'event.provider': 'alerting',
            },
          },
        ],
      },
    });
  });

  it('should create correct query when aggType=count and termField is undefined (count over all) and selector params are undefined', async () => {
    await timeSeriesQuery(params);
    expect(esClient.search).toHaveBeenCalledWith(
      {
        allow_no_indices: true,
        body: {
          aggs: {
            dateAgg: {
              date_range: {
                field: 'time-field',
                format: 'strict_date_time',
                ranges: [
                  {
                    from: '2021-04-22T15:14:31.000Z',
                    to: '2021-04-22T15:19:31.000Z',
                  },
                  {
                    from: '2021-04-22T15:15:31.000Z',
                    to: '2021-04-22T15:20:31.000Z',
                  },
                ],
              },
            },
          },
          query: {
            bool: {
              filter: [
                {
                  range: {
                    'time-field': {
                      format: 'strict_date_time',
                      gte: '2021-04-22T15:14:31.000Z',
                      lt: '2021-04-22T15:20:31.000Z',
                    },
                  },
                },
              ],
            },
          },
          size: 0,
        },
        ignore_unavailable: true,
        index: 'index-name',
      },
      { ignore: [404], meta: true }
    );
  });

  it('should create correct query when aggType=count and termField is undefined (count over all) and selector params are defined', async () => {
    await timeSeriesQuery({
      ...params,
      condition: {
        resultLimit: 1000,
        conditionScript: `params.compareValue > 1`,
      },
    });
    expect(esClient.search).toHaveBeenCalledWith(
      {
        allow_no_indices: true,
        body: {
          aggs: {
            dateAgg: {
              date_range: {
                field: 'time-field',
                format: 'strict_date_time',
                ranges: [
                  {
                    from: '2021-04-22T15:14:31.000Z',
                    to: '2021-04-22T15:19:31.000Z',
                  },
                  {
                    from: '2021-04-22T15:15:31.000Z',
                    to: '2021-04-22T15:20:31.000Z',
                  },
                ],
              },
            },
          },
          query: {
            bool: {
              filter: [
                {
                  range: {
                    'time-field': {
                      format: 'strict_date_time',
                      gte: '2021-04-22T15:14:31.000Z',
                      lt: '2021-04-22T15:20:31.000Z',
                    },
                  },
                },
              ],
            },
          },
          size: 0,
        },
        ignore_unavailable: true,
        index: 'index-name',
      },
      { ignore: [404], meta: true }
    );
  });

  it('should create correct query when aggType=count and termField is specified (count over top N termField) and selector params are undefined', async () => {
    await timeSeriesQuery({
      ...params,
      query: {
        ...params.query,
        termField: 'the-term',
        termSize: 10,
      },
    });
    expect(esClient.search).toHaveBeenCalledWith(
      {
        allow_no_indices: true,
        body: {
          aggs: {
            groupAgg: {
              terms: {
                field: 'the-term',
                size: 10,
              },
              aggs: {
                dateAgg: {
                  date_range: {
                    field: 'time-field',
                    format: 'strict_date_time',
                    ranges: [
                      {
                        from: '2021-04-22T15:14:31.000Z',
                        to: '2021-04-22T15:19:31.000Z',
                      },
                      {
                        from: '2021-04-22T15:15:31.000Z',
                        to: '2021-04-22T15:20:31.000Z',
                      },
                    ],
                  },
                },
              },
            },
          },
          query: {
            bool: {
              filter: [
                {
                  range: {
                    'time-field': {
                      format: 'strict_date_time',
                      gte: '2021-04-22T15:14:31.000Z',
                      lt: '2021-04-22T15:20:31.000Z',
                    },
                  },
                },
              ],
            },
          },
          size: 0,
        },
        ignore_unavailable: true,
        index: 'index-name',
      },
      { ignore: [404], meta: true }
    );
  });

  it('should create correct query when aggType=count and termField is specified (count over top N termField) and selector params are defined', async () => {
    await timeSeriesQuery({
      ...params,
      query: {
        ...params.query,
        termField: 'the-term',
        termSize: 10,
      },
      condition: {
        resultLimit: 1000,
        conditionScript: `params.compareValue > 1`,
      },
    });
    expect(esClient.search).toHaveBeenCalledWith(
      {
        allow_no_indices: true,
        body: {
          aggs: {
            groupAgg: {
              terms: {
                field: 'the-term',
                size: 10,
              },
              aggs: {
                conditionSelector: {
                  bucket_selector: {
                    buckets_path: {
                      compareValue: '_count',
                    },
                    script: `params.compareValue > 1`,
                  },
                },
                dateAgg: {
                  date_range: {
                    field: 'time-field',
                    format: 'strict_date_time',
                    ranges: [
                      {
                        from: '2021-04-22T15:14:31.000Z',
                        to: '2021-04-22T15:19:31.000Z',
                      },
                      {
                        from: '2021-04-22T15:15:31.000Z',
                        to: '2021-04-22T15:20:31.000Z',
                      },
                    ],
                  },
                },
              },
            },
            groupAggCount: {
              stats_bucket: {
                buckets_path: 'groupAgg._count',
              },
            },
          },
          query: {
            bool: {
              filter: [
                {
                  range: {
                    'time-field': {
                      format: 'strict_date_time',
                      gte: '2021-04-22T15:14:31.000Z',
                      lt: '2021-04-22T15:20:31.000Z',
                    },
                  },
                },
              ],
            },
          },
          size: 0,
        },
        ignore_unavailable: true,
        index: 'index-name',
      },
      { ignore: [404], meta: true }
    );
  });

  it('should create correct query when aggType!=count and termField is undefined (aggregate metric over all) and selector params are undefined', async () => {
    await timeSeriesQuery({
      ...params,
      query: {
        ...params.query,
        aggType: 'avg',
        aggField: 'avg-field',
      },
    });
    expect(esClient.search).toHaveBeenCalledWith(
      {
        allow_no_indices: true,
        body: {
          aggs: {
            dateAgg: {
              date_range: {
                field: 'time-field',
                format: 'strict_date_time',
                ranges: [
                  {
                    from: '2021-04-22T15:14:31.000Z',
                    to: '2021-04-22T15:19:31.000Z',
                  },
                  {
                    from: '2021-04-22T15:15:31.000Z',
                    to: '2021-04-22T15:20:31.000Z',
                  },
                ],
              },
              aggs: {
                metricAgg: {
                  avg: {
                    field: 'avg-field',
                  },
                },
              },
            },
            sortValueAgg: {
              avg: {
                field: 'avg-field',
              },
            },
          },
          query: {
            bool: {
              filter: [
                {
                  range: {
                    'time-field': {
                      format: 'strict_date_time',
                      gte: '2021-04-22T15:14:31.000Z',
                      lt: '2021-04-22T15:20:31.000Z',
                    },
                  },
                },
              ],
            },
          },
          size: 0,
        },
        ignore_unavailable: true,
        index: 'index-name',
      },
      { ignore: [404], meta: true }
    );
  });

  it('should create correct query when aggType!=count and termField is undefined (aggregate metric over all) and selector params are defined', async () => {
    await timeSeriesQuery({
      ...params,
      query: {
        ...params.query,
        aggType: 'avg',
        aggField: 'avg-field',
      },
      condition: {
        resultLimit: 1000,
        conditionScript: `params.compareValue > 1`,
      },
    });
    expect(esClient.search).toHaveBeenCalledWith(
      {
        allow_no_indices: true,
        body: {
          aggs: {
            dateAgg: {
              date_range: {
                field: 'time-field',
                format: 'strict_date_time',
                ranges: [
                  {
                    from: '2021-04-22T15:14:31.000Z',
                    to: '2021-04-22T15:19:31.000Z',
                  },
                  {
                    from: '2021-04-22T15:15:31.000Z',
                    to: '2021-04-22T15:20:31.000Z',
                  },
                ],
              },
              aggs: {
                metricAgg: {
                  avg: {
                    field: 'avg-field',
                  },
                },
              },
            },
            sortValueAgg: {
              avg: {
                field: 'avg-field',
              },
            },
          },
          query: {
            bool: {
              filter: [
                {
                  range: {
                    'time-field': {
                      format: 'strict_date_time',
                      gte: '2021-04-22T15:14:31.000Z',
                      lt: '2021-04-22T15:20:31.000Z',
                    },
                  },
                },
              ],
            },
          },
          size: 0,
        },
        ignore_unavailable: true,
        index: 'index-name',
      },
      { ignore: [404], meta: true }
    );
  });

  it('should create correct query when aggType!=count and termField is specified (aggregate metric over top N termField) and selector params are undefined', async () => {
    await timeSeriesQuery({
      ...params,
      query: {
        ...params.query,
        aggType: 'avg',
        aggField: 'avg-field',
        termField: 'the-field',
        termSize: 20,
      },
    });
    expect(esClient.search).toHaveBeenCalledWith(
      {
        allow_no_indices: true,
        body: {
          aggs: {
            groupAgg: {
              terms: {
                field: 'the-field',
                order: {
                  sortValueAgg: 'desc',
                },
                size: 20,
              },
              aggs: {
                dateAgg: {
                  date_range: {
                    field: 'time-field',
                    format: 'strict_date_time',
                    ranges: [
                      {
                        from: '2021-04-22T15:14:31.000Z',
                        to: '2021-04-22T15:19:31.000Z',
                      },
                      {
                        from: '2021-04-22T15:15:31.000Z',
                        to: '2021-04-22T15:20:31.000Z',
                      },
                    ],
                  },
                  aggs: {
                    metricAgg: {
                      avg: {
                        field: 'avg-field',
                      },
                    },
                  },
                },
                sortValueAgg: {
                  avg: {
                    field: 'avg-field',
                  },
                },
              },
            },
          },
          query: {
            bool: {
              filter: [
                {
                  range: {
                    'time-field': {
                      format: 'strict_date_time',
                      gte: '2021-04-22T15:14:31.000Z',
                      lt: '2021-04-22T15:20:31.000Z',
                    },
                  },
                },
              ],
            },
          },
          size: 0,
        },
        ignore_unavailable: true,
        index: 'index-name',
      },
      { ignore: [404], meta: true }
    );
  });

  it('should create correct query when aggType!=count and termField is specified (aggregate metric over top N termField) and selector params are defined', async () => {
    await timeSeriesQuery({
      ...params,
      query: {
        ...params.query,
        aggType: 'avg',
        aggField: 'avg-field',
        termField: 'the-field',
        termSize: 20,
      },
      condition: {
        resultLimit: 1000,
        conditionScript: `params.compareValue > 1`,
      },
    });
    expect(esClient.search).toHaveBeenCalledWith(
      {
        allow_no_indices: true,
        body: {
          aggs: {
            groupAgg: {
              terms: {
                field: 'the-field',
                order: {
                  sortValueAgg: 'desc',
                },
                size: 20,
              },
              aggs: {
                dateAgg: {
                  date_range: {
                    field: 'time-field',
                    format: 'strict_date_time',
                    ranges: [
                      {
                        from: '2021-04-22T15:14:31.000Z',
                        to: '2021-04-22T15:19:31.000Z',
                      },
                      {
                        from: '2021-04-22T15:15:31.000Z',
                        to: '2021-04-22T15:20:31.000Z',
                      },
                    ],
                  },
                  aggs: {
                    metricAgg: {
                      avg: {
                        field: 'avg-field',
                      },
                    },
                  },
                },
                conditionSelector: {
                  bucket_selector: {
                    buckets_path: {
                      compareValue: 'sortValueAgg',
                    },
                    script: 'params.compareValue > 1',
                  },
                },
                sortValueAgg: {
                  avg: {
                    field: 'avg-field',
                  },
                },
              },
            },
            groupAggCount: {
              stats_bucket: {
                buckets_path: 'groupAgg._count',
              },
            },
          },
          query: {
            bool: {
              filter: [
                {
                  range: {
                    'time-field': {
                      format: 'strict_date_time',
                      gte: '2021-04-22T15:14:31.000Z',
                      lt: '2021-04-22T15:20:31.000Z',
                    },
                  },
                },
              ],
            },
          },
          size: 0,
        },
        ignore_unavailable: true,
        index: 'index-name',
      },
      { ignore: [404], meta: true }
    );
  });

  it('should correctly apply the resultLimit if specified', async () => {
    await timeSeriesQuery({
      ...params,
      query: {
        ...params.query,
        termField: 'the-term',
        termSize: 100,
      },
      condition: {
        resultLimit: 5,
        conditionScript: `params.compareValue > 1`,
      },
    });
    expect(esClient.search).toHaveBeenCalledWith(
      {
        allow_no_indices: true,
        body: {
          aggs: {
            groupAgg: {
              terms: {
                field: 'the-term',
                size: 6,
              },
              aggs: {
                conditionSelector: {
                  bucket_selector: {
                    buckets_path: {
                      compareValue: '_count',
                    },
                    script: `params.compareValue > 1`,
                  },
                },
                dateAgg: {
                  date_range: {
                    field: 'time-field',
                    format: 'strict_date_time',
                    ranges: [
                      {
                        from: '2021-04-22T15:14:31.000Z',
                        to: '2021-04-22T15:19:31.000Z',
                      },
                      {
                        from: '2021-04-22T15:15:31.000Z',
                        to: '2021-04-22T15:20:31.000Z',
                      },
                    ],
                  },
                },
              },
            },
            groupAggCount: {
              stats_bucket: {
                buckets_path: 'groupAgg._count',
              },
            },
          },
          query: {
            bool: {
              filter: [
                {
                  range: {
                    'time-field': {
                      format: 'strict_date_time',
                      gte: '2021-04-22T15:14:31.000Z',
                      lt: '2021-04-22T15:20:31.000Z',
                    },
                  },
                },
              ],
            },
          },
          size: 0,
        },
        ignore_unavailable: true,
        index: 'index-name',
      },
      { ignore: [404], meta: true }
    );
  });
});

describe('getResultFromEs', () => {
  it('correctly parses time series results for count over all aggregation', () => {
    // results should be same whether isConditionInQuery is true or false
    expect(
      getResultFromEs({
        isCountAgg: true,
        isGroupAgg: false,
        isConditionInQuery: true,
        esResult: {
          took: 1,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: { value: 481, relation: 'eq' }, max_score: null, hits: [] },
          aggregations: {
            dateAgg: {
              buckets: [
                {
                  key: '2022-09-20T00:14:31.000Z-2022-09-20T23:19:31.000Z',
                  from: 1663632871000,
                  from_as_string: '2022-09-20T00:14:31.000Z',
                  to: 1663715971000,
                  to_as_string: '2022-09-20T23:19:31.000Z',
                  doc_count: 481,
                },
              ],
            },
          },
        },
      })
    ).toEqual({
      results: [
        {
          group: 'all documents',
          metrics: [['2022-09-20T23:19:31.000Z', 481]],
        },
      ],
      truncated: false,
    });

    expect(
      getResultFromEs({
        isCountAgg: true,
        isGroupAgg: false,
        isConditionInQuery: false,
        esResult: {
          took: 1,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: { value: 481, relation: 'eq' }, max_score: null, hits: [] },
          aggregations: {
            dateAgg: {
              buckets: [
                {
                  key: '2022-09-20T00:14:31.000Z-2022-09-20T23:19:31.000Z',
                  from: 1663632871000,
                  from_as_string: '2022-09-20T00:14:31.000Z',
                  to: 1663715971000,
                  to_as_string: '2022-09-20T23:19:31.000Z',
                  doc_count: 481,
                },
              ],
            },
          },
        },
      })
    ).toEqual({
      results: [
        {
          group: 'all documents',
          metrics: [['2022-09-20T23:19:31.000Z', 481]],
        },
      ],
      truncated: false,
    });
  });

  it('correctly parses time series results with no aggregation data for count over all aggregation', () => {
    // this could happen with cross cluster searches when cluster permissions are incorrect
    // the query completes but doesn't return any aggregations

    // results should be same whether isConditionInQuery is true or false
    expect(
      getResultFromEs({
        isCountAgg: true,
        isGroupAgg: false,
        isConditionInQuery: true,
        esResult: {
          took: 0,
          timed_out: false,
          _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
          _clusters: { total: 1, successful: 1, skipped: 0 },
          hits: { total: { value: 0, relation: 'eq' }, hits: [] },
        },
      })
    ).toEqual({
      results: [],
      truncated: false,
    });

    expect(
      getResultFromEs({
        isCountAgg: true,
        isGroupAgg: false,
        isConditionInQuery: false,
        esResult: {
          took: 0,
          timed_out: false,
          _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
          _clusters: { total: 1, successful: 1, skipped: 0 },
          hits: { total: { value: 0, relation: 'eq' }, hits: [] },
        },
      })
    ).toEqual({
      results: [],
      truncated: false,
    });
  });

  it('correctly parses time series results for count over top N termField aggregation when isConditionInQuery = false', () => {
    expect(
      getResultFromEs({
        isCountAgg: true,
        isGroupAgg: true,
        isConditionInQuery: false,
        esResult: {
          took: 1,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: { value: 481, relation: 'eq' }, max_score: null, hits: [] },
          aggregations: {
            groupAgg: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'host-2',
                  doc_count: 149,
                  dateAgg: {
                    buckets: [
                      {
                        key: '2021-04-22T15:18:43.191Z-2021-04-22T15:23:43.191Z',
                        from: 1619104723191,
                        from_as_string: '2021-04-22T15:18:43.191Z',
                        to: 1619105023191,
                        to_as_string: '2021-04-22T15:23:43.191Z',
                        doc_count: 149,
                      },
                    ],
                  },
                },
                {
                  key: 'host-1',
                  doc_count: 53,
                  dateAgg: {
                    buckets: [
                      {
                        key: '2021-04-22T15:18:43.191Z-2021-04-22T15:23:43.191Z',
                        from: 1619104723191,
                        from_as_string: '2021-04-22T15:18:43.191Z',
                        to: 1619105023191,
                        to_as_string: '2021-04-22T15:23:43.191Z',
                        doc_count: 53,
                      },
                    ],
                  },
                },
              ],
            },
          },
        },
      })
    ).toEqual({
      results: [
        {
          group: 'host-2',
          metrics: [['2021-04-22T15:23:43.191Z', 149]],
        },
        {
          group: 'host-1',
          metrics: [['2021-04-22T15:23:43.191Z', 53]],
        },
      ],
      truncated: false,
    });
  });

  it('correctly parses time series results for count over top N termField aggregation when isConditionInQuery = true', () => {
    expect(
      getResultFromEs({
        isCountAgg: true,
        isGroupAgg: true,
        isConditionInQuery: true,
        esResult: {
          took: 1,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: { value: 481, relation: 'eq' }, max_score: null, hits: [] },
          aggregations: {
            groupAgg: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'host-2',
                  doc_count: 149,
                  dateAgg: {
                    buckets: [
                      {
                        key: '2021-04-22T15:18:43.191Z-2021-04-22T15:23:43.191Z',
                        from: 1619104723191,
                        from_as_string: '2021-04-22T15:18:43.191Z',
                        to: 1619105023191,
                        to_as_string: '2021-04-22T15:23:43.191Z',
                        doc_count: 149,
                      },
                    ],
                  },
                },
                {
                  key: 'host-1',
                  doc_count: 53,
                  dateAgg: {
                    buckets: [
                      {
                        key: '2021-04-22T15:18:43.191Z-2021-04-22T15:23:43.191Z',
                        from: 1619104723191,
                        from_as_string: '2021-04-22T15:18:43.191Z',
                        to: 1619105023191,
                        to_as_string: '2021-04-22T15:23:43.191Z',
                        doc_count: 53,
                      },
                    ],
                  },
                },
              ],
            },
            groupAggCount: {
              count: 2,
              min: 90,
              max: 90,
              avg: 90,
              sum: 180,
            },
          },
        },
      })
    ).toEqual({
      results: [
        {
          group: 'host-2',
          metrics: [['2021-04-22T15:23:43.191Z', 149]],
        },
        {
          group: 'host-1',
          metrics: [['2021-04-22T15:23:43.191Z', 53]],
        },
      ],
      truncated: false,
    });
  });

  it('correctly returns truncated status for time series results for count over top N termField aggregation when isConditionInQuery = true', () => {
    expect(
      getResultFromEs({
        isCountAgg: true,
        isGroupAgg: true,
        isConditionInQuery: true,
        resultLimit: 5,
        esResult: {
          took: 1,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: { value: 481, relation: 'eq' }, max_score: null, hits: [] },
          aggregations: {
            groupAgg: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'host-2',
                  doc_count: 149,
                  dateAgg: {
                    buckets: [
                      {
                        key: '2021-04-22T15:18:43.191Z-2021-04-22T15:23:43.191Z',
                        from: 1619104723191,
                        from_as_string: '2021-04-22T15:18:43.191Z',
                        to: 1619105023191,
                        to_as_string: '2021-04-22T15:23:43.191Z',
                        doc_count: 149,
                      },
                    ],
                  },
                },
                {
                  key: 'host-1',
                  doc_count: 53,
                  dateAgg: {
                    buckets: [
                      {
                        key: '2021-04-22T15:18:43.191Z-2021-04-22T15:23:43.191Z',
                        from: 1619104723191,
                        from_as_string: '2021-04-22T15:18:43.191Z',
                        to: 1619105023191,
                        to_as_string: '2021-04-22T15:23:43.191Z',
                        doc_count: 53,
                      },
                    ],
                  },
                },
                {
                  key: 'host-3',
                  doc_count: 40,
                  dateAgg: {
                    buckets: [
                      {
                        key: '2021-04-22T15:18:43.191Z-2021-04-22T15:23:43.191Z',
                        from: 1619104723191,
                        from_as_string: '2021-04-22T15:18:43.191Z',
                        to: 1619105023191,
                        to_as_string: '2021-04-22T15:23:43.191Z',
                        doc_count: 40,
                      },
                    ],
                  },
                },
                {
                  key: 'host-6',
                  doc_count: 55,
                  dateAgg: {
                    buckets: [
                      {
                        key: '2021-04-22T15:18:43.191Z-2021-04-22T15:23:43.191Z',
                        from: 1619104723191,
                        from_as_string: '2021-04-22T15:18:43.191Z',
                        to: 1619105023191,
                        to_as_string: '2021-04-22T15:23:43.191Z',
                        doc_count: 55,
                      },
                    ],
                  },
                },
                {
                  key: 'host-9',
                  doc_count: 54,
                  dateAgg: {
                    buckets: [
                      {
                        key: '2021-04-22T15:18:43.191Z-2021-04-22T15:23:43.191Z',
                        from: 1619104723191,
                        from_as_string: '2021-04-22T15:18:43.191Z',
                        to: 1619105023191,
                        to_as_string: '2021-04-22T15:23:43.191Z',
                        doc_count: 54,
                      },
                    ],
                  },
                },
                {
                  key: 'host-11',
                  doc_count: 2,
                  dateAgg: {
                    buckets: [
                      {
                        key: '2021-04-22T15:18:43.191Z-2021-04-22T15:23:43.191Z',
                        from: 1619104723191,
                        from_as_string: '2021-04-22T15:18:43.191Z',
                        to: 1619105023191,
                        to_as_string: '2021-04-22T15:23:43.191Z',
                        doc_count: 2,
                      },
                    ],
                  },
                },
              ],
            },
            groupAggCount: {
              count: 6,
              min: 90,
              max: 90,
              avg: 90,
              sum: 180,
            },
          },
        },
      })
    ).toEqual({
      results: [
        {
          group: 'host-2',
          metrics: [['2021-04-22T15:23:43.191Z', 149]],
        },
        {
          group: 'host-1',
          metrics: [['2021-04-22T15:23:43.191Z', 53]],
        },
        {
          group: 'host-3',
          metrics: [['2021-04-22T15:23:43.191Z', 40]],
        },
        {
          group: 'host-6',
          metrics: [['2021-04-22T15:23:43.191Z', 55]],
        },
        {
          group: 'host-9',
          metrics: [['2021-04-22T15:23:43.191Z', 54]],
        },
      ],
      truncated: true,
    });
  });

  it('correctly parses time series results with no aggregation data for count over top N termField aggregation', () => {
    // this could happen with cross cluster searches when cluster permissions are incorrect
    // the query completes but doesn't return any aggregations

    // results should be same whether isConditionInQuery is true or false
    expect(
      getResultFromEs({
        isCountAgg: true,
        isGroupAgg: true,
        isConditionInQuery: true,
        esResult: {
          took: 1,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: { value: 481, relation: 'eq' }, max_score: null, hits: [] },
        },
      })
    ).toEqual({
      results: [],
      truncated: false,
    });

    expect(
      getResultFromEs({
        isCountAgg: true,
        isGroupAgg: true,
        isConditionInQuery: false,
        esResult: {
          took: 1,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: { value: 481, relation: 'eq' }, max_score: null, hits: [] },
        },
      })
    ).toEqual({
      results: [],
      truncated: false,
    });
  });

  it('correctly parses time series results for aggregate metric over all aggregation', () => {
    // results should be same whether isConditionInQuery is true or false
    expect(
      getResultFromEs({
        isCountAgg: false,
        isGroupAgg: false,
        isConditionInQuery: true,
        esResult: {
          took: 1,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: { value: 481, relation: 'eq' }, max_score: null, hits: [] },
          aggregations: {
            sortValueAgg: { value: 0.5000000018251423 },
            dateAgg: {
              buckets: [
                {
                  key: '2022-09-20T00:14:31.000Z-2022-09-20T23:19:31.000Z',
                  from: 1663632871000,
                  from_as_string: '2022-09-20T00:14:31.000Z',
                  to: 1663715971000,
                  to_as_string: '2022-09-20T23:19:31.000Z',
                  doc_count: 481,
                  metricAgg: { value: 0.5000000018251423 },
                },
              ],
            },
          },
        },
      })
    ).toEqual({
      results: [
        {
          group: 'all documents',
          metrics: [['2022-09-20T23:19:31.000Z', 0.5000000018251423]],
        },
      ],
      truncated: false,
    });

    expect(
      getResultFromEs({
        isCountAgg: false,
        isGroupAgg: false,
        isConditionInQuery: false,
        esResult: {
          took: 1,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: { value: 481, relation: 'eq' }, max_score: null, hits: [] },
          aggregations: {
            sortValueAgg: { value: 0.5000000018251423 },
            dateAgg: {
              buckets: [
                {
                  key: '2022-09-20T00:14:31.000Z-2022-09-20T23:19:31.000Z',
                  from: 1663632871000,
                  from_as_string: '2022-09-20T00:14:31.000Z',
                  to: 1663715971000,
                  to_as_string: '2022-09-20T23:19:31.000Z',
                  doc_count: 481,
                  metricAgg: { value: 0.5000000018251423 },
                },
              ],
            },
          },
        },
      })
    ).toEqual({
      results: [
        {
          group: 'all documents',
          metrics: [['2022-09-20T23:19:31.000Z', 0.5000000018251423]],
        },
      ],
      truncated: false,
    });
  });

  it('correctly parses time series results with no aggregation data for aggregate metric over all aggregation', () => {
    // this could happen with cross cluster searches when cluster permissions are incorrect
    // the query completes but doesn't return any aggregations

    // results should be same whether isConditionInQuery is true or false
    expect(
      getResultFromEs({
        isCountAgg: false,
        isGroupAgg: false,
        isConditionInQuery: true,
        esResult: {
          took: 0,
          timed_out: false,
          _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
          _clusters: { total: 1, successful: 1, skipped: 0 },
          hits: { total: { value: 0, relation: 'eq' }, hits: [] },
        },
      })
    ).toEqual({
      results: [],
      truncated: false,
    });

    expect(
      getResultFromEs({
        isCountAgg: false,
        isGroupAgg: false,
        isConditionInQuery: false,
        esResult: {
          took: 0,
          timed_out: false,
          _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
          _clusters: { total: 1, successful: 1, skipped: 0 },
          hits: { total: { value: 0, relation: 'eq' }, hits: [] },
        },
      })
    ).toEqual({
      results: [],
      truncated: false,
    });
  });

  it('correctly parses time series results for aggregate metric over top N termField aggregation when isConditionInQuery = false', () => {
    expect(
      getResultFromEs({
        isCountAgg: false,
        isGroupAgg: true,
        isConditionInQuery: false,
        esResult: {
          took: 1,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: { value: 481, relation: 'eq' }, max_score: null, hits: [] },
          aggregations: {
            groupAgg: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'host-2',
                  doc_count: 149,
                  sortValueAgg: { value: 0.7100000018251423 },
                  dateAgg: {
                    buckets: [
                      {
                        key: '2021-04-22T15:18:43.191Z-2021-04-22T15:23:43.191Z',
                        from: 1619104723191,
                        from_as_string: '2021-04-22T15:18:43.191Z',
                        to: 1619105023191,
                        to_as_string: '2021-04-22T15:23:43.191Z',
                        doc_count: 149,
                        metricAgg: { value: 0.7100000018251423 },
                      },
                    ],
                  },
                },
                {
                  key: 'host-1',
                  doc_count: 53,
                  sortValueAgg: { value: 0.5000000018251423 },
                  dateAgg: {
                    buckets: [
                      {
                        key: '2021-04-22T15:18:43.191Z-2021-04-22T15:23:43.191Z',
                        from: 1619104723191,
                        from_as_string: '2021-04-22T15:18:43.191Z',
                        to: 1619105023191,
                        to_as_string: '2021-04-22T15:23:43.191Z',
                        doc_count: 53,
                        metricAgg: { value: 0.5000000018251423 },
                      },
                    ],
                  },
                },
              ],
            },
          },
        },
      })
    ).toEqual({
      results: [
        {
          group: 'host-2',
          metrics: [['2021-04-22T15:23:43.191Z', 0.7100000018251423]],
        },
        {
          group: 'host-1',
          metrics: [['2021-04-22T15:23:43.191Z', 0.5000000018251423]],
        },
      ],
      truncated: false,
    });
  });

  it('correctly parses time series results for aggregate metric over top N termField aggregation when isConditionInQuery = true', () => {
    expect(
      getResultFromEs({
        isCountAgg: false,
        isGroupAgg: true,
        isConditionInQuery: true,
        esResult: {
          took: 1,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: { value: 481, relation: 'eq' }, max_score: null, hits: [] },
          aggregations: {
            groupAgg: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'host-2',
                  doc_count: 149,
                  sortValueAgg: { value: 0.7100000018251423 },
                  dateAgg: {
                    buckets: [
                      {
                        key: '2021-04-22T15:18:43.191Z-2021-04-22T15:23:43.191Z',
                        from: 1619104723191,
                        from_as_string: '2021-04-22T15:18:43.191Z',
                        to: 1619105023191,
                        to_as_string: '2021-04-22T15:23:43.191Z',
                        doc_count: 149,
                        metricAgg: { value: 0.7100000018251423 },
                      },
                    ],
                  },
                },
                {
                  key: 'host-1',
                  doc_count: 53,
                  sortValueAgg: { value: 0.5000000018251423 },
                  dateAgg: {
                    buckets: [
                      {
                        key: '2021-04-22T15:18:43.191Z-2021-04-22T15:23:43.191Z',
                        from: 1619104723191,
                        from_as_string: '2021-04-22T15:18:43.191Z',
                        to: 1619105023191,
                        to_as_string: '2021-04-22T15:23:43.191Z',
                        doc_count: 53,
                        metricAgg: { value: 0.5000000018251423 },
                      },
                    ],
                  },
                },
              ],
            },
            groupAggCount: {
              count: 2,
              min: 75,
              max: 90,
              avg: 82.5,
              sum: 165,
            },
          },
        },
      })
    ).toEqual({
      results: [
        {
          group: 'host-2',
          metrics: [['2021-04-22T15:23:43.191Z', 0.7100000018251423]],
        },
        {
          group: 'host-1',
          metrics: [['2021-04-22T15:23:43.191Z', 0.5000000018251423]],
        },
      ],
      truncated: false,
    });
  });

  it('correctly returns truncated status for time series results for aggregate metrics over top N termField aggregation when isConditionInQuery = true', () => {
    expect(
      getResultFromEs({
        isCountAgg: false,
        isGroupAgg: true,
        isConditionInQuery: true,
        resultLimit: 5,
        esResult: {
          took: 1,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: { value: 481, relation: 'eq' }, max_score: null, hits: [] },
          aggregations: {
            groupAgg: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'host-2',
                  doc_count: 149,
                  sortValueAgg: { value: 0.7100000018251423 },
                  dateAgg: {
                    buckets: [
                      {
                        key: '2021-04-22T15:18:43.191Z-2021-04-22T15:23:43.191Z',
                        from: 1619104723191,
                        from_as_string: '2021-04-22T15:18:43.191Z',
                        to: 1619105023191,
                        to_as_string: '2021-04-22T15:23:43.191Z',
                        doc_count: 149,
                        metricAgg: { value: 0.7100000018251423 },
                      },
                    ],
                  },
                },
                {
                  key: 'host-1',
                  doc_count: 53,
                  sortValueAgg: { value: 0.5000000018251423 },
                  dateAgg: {
                    buckets: [
                      {
                        key: '2021-04-22T15:18:43.191Z-2021-04-22T15:23:43.191Z',
                        from: 1619104723191,
                        from_as_string: '2021-04-22T15:18:43.191Z',
                        to: 1619105023191,
                        to_as_string: '2021-04-22T15:23:43.191Z',
                        doc_count: 53,
                        metricAgg: { value: 0.5000000018251423 },
                      },
                    ],
                  },
                },
                {
                  key: 'host-3',
                  doc_count: 40,
                  sortValueAgg: { value: 0.4900000018251423 },
                  dateAgg: {
                    buckets: [
                      {
                        key: '2021-04-22T15:18:43.191Z-2021-04-22T15:23:43.191Z',
                        from: 1619104723191,
                        from_as_string: '2021-04-22T15:18:43.191Z',
                        to: 1619105023191,
                        to_as_string: '2021-04-22T15:23:43.191Z',
                        doc_count: 40,
                        metricAgg: { value: 0.4900000018251423 },
                      },
                    ],
                  },
                },
                {
                  key: 'host-6',
                  doc_count: 55,
                  sortValueAgg: { value: 0.4600000018251423 },
                  dateAgg: {
                    buckets: [
                      {
                        key: '2021-04-22T15:18:43.191Z-2021-04-22T15:23:43.191Z',
                        from: 1619104723191,
                        from_as_string: '2021-04-22T15:18:43.191Z',
                        to: 1619105023191,
                        to_as_string: '2021-04-22T15:23:43.191Z',
                        doc_count: 55,
                        metricAgg: { value: 0.4600000018251423 },
                      },
                    ],
                  },
                },
                {
                  key: 'host-9',
                  doc_count: 54,
                  sortValueAgg: { value: 0.3300000018251423 },
                  dateAgg: {
                    buckets: [
                      {
                        key: '2021-04-22T15:18:43.191Z-2021-04-22T15:23:43.191Z',
                        from: 1619104723191,
                        from_as_string: '2021-04-22T15:18:43.191Z',
                        to: 1619105023191,
                        to_as_string: '2021-04-22T15:23:43.191Z',
                        doc_count: 54,
                        metricAgg: { value: 0.3300000018251423 },
                      },
                    ],
                  },
                },
                {
                  key: 'host-11',
                  doc_count: 2,
                  sortValueAgg: { value: 0.1200000018251423 },
                  dateAgg: {
                    buckets: [
                      {
                        key: '2021-04-22T15:18:43.191Z-2021-04-22T15:23:43.191Z',
                        from: 1619104723191,
                        from_as_string: '2021-04-22T15:18:43.191Z',
                        to: 1619105023191,
                        to_as_string: '2021-04-22T15:23:43.191Z',
                        doc_count: 2,
                        metricAgg: { value: 0.1200000018251423 },
                      },
                    ],
                  },
                },
              ],
            },
            groupAggCount: {
              count: 6,
              min: 75,
              max: 90,
              avg: 82.5,
              sum: 165,
            },
          },
        },
      })
    ).toEqual({
      results: [
        {
          group: 'host-2',
          metrics: [['2021-04-22T15:23:43.191Z', 0.7100000018251423]],
        },
        {
          group: 'host-1',
          metrics: [['2021-04-22T15:23:43.191Z', 0.5000000018251423]],
        },
        {
          group: 'host-3',
          metrics: [['2021-04-22T15:23:43.191Z', 0.4900000018251423]],
        },
        {
          group: 'host-6',
          metrics: [['2021-04-22T15:23:43.191Z', 0.4600000018251423]],
        },
        {
          group: 'host-9',
          metrics: [['2021-04-22T15:23:43.191Z', 0.3300000018251423]],
        },
      ],
      truncated: true,
    });
  });

  it('correctly parses time series results with no aggregation data for aggregate metric over top N termField aggregation', () => {
    // this could happen with cross cluster searches when cluster permissions are incorrect
    // the query completes but doesn't return any aggregations

    // results should be same whether isConditionInQuery is true or false
    expect(
      getResultFromEs({
        isCountAgg: false,
        isGroupAgg: true,
        isConditionInQuery: true,
        esResult: {
          took: 1,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: { value: 481, relation: 'eq' }, max_score: null, hits: [] },
        },
      })
    ).toEqual({
      results: [],
      truncated: false,
    });

    expect(
      getResultFromEs({
        isCountAgg: false,
        isGroupAgg: true,
        isConditionInQuery: false,
        esResult: {
          took: 1,
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: { value: 481, relation: 'eq' }, max_score: null, hits: [] },
        },
      })
    ).toEqual({
      results: [],
      truncated: false,
    });
  });
});
