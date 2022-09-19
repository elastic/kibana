/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// test error conditions of calling timeSeriesQuery - postive results tested in FT

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
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
    expect(timeSeriesQuery({ ...params, query: {...params.query, dateStart: 'x'} })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"invalid date format for dateStart: \\"x\\""`
    );
  });

  it('should create correct query when aggType=count and termField is undefined (count over all)', async () => {
    await timeSeriesQuery(params);
    expect(esClient.search).toHaveBeenCalledWith({
         "allow_no_indices": true,
         "body":  {
           "aggs":  {
             "dateAgg":  {
               "date_range":  {
                 "field": "time-field",
                 "format": "strict_date_time",
                 "ranges":  [
                    {
                     "from": "2021-04-22T15:14:31.000Z",
                     "to": "2021-04-22T15:19:31.000Z",
                   },
                    {
                     "from": "2021-04-22T15:15:31.000Z",
                     "to": "2021-04-22T15:20:31.000Z",
                   },
                 ],
               },
             },
           },
           "query":  {
             "bool":  {
               "filter":  {
                 "range":  {
                   "time-field":  {
                     "format": "strict_date_time",
                     "gte": "2021-04-22T15:14:31.000Z",
                     "lt": "2021-04-22T15:20:31.000Z",
                   },
                 },
               },
             },
           },
           "size": 0,
         },
         "ignore_unavailable": true,
         "index": "index-name",
       },
       {"ignore": [404], "meta": true});
  });

  it('should create correct query when aggType=count and termField is specified (count over top N termField)', async () => {
    await timeSeriesQuery({
      ...params,
      query: {
        ...params.query,
        termField: 'the-term',
        termSize: 10,
      }
    });
    expect(esClient.search).toHaveBeenCalledWith({
         "allow_no_indices": true,
         "body":  {
           "aggs":  {
            "groupCardinalityAgg": {
              "cardinality": {
                "field": "the-term"
              }
            },
             "groupAgg": {
              "terms": {
                "field": "the-term",
                "size": 10
              },
              "aggs": {
                "dateAgg":  {
                  "date_range":  {
                    "field": "time-field",
                    "format": "strict_date_time",
                    "ranges":  [
                       {
                        "from": "2021-04-22T15:14:31.000Z",
                        "to": "2021-04-22T15:19:31.000Z",
                      },
                       {
                        "from": "2021-04-22T15:15:31.000Z",
                        "to": "2021-04-22T15:20:31.000Z",
                      },
                    ],
                  },
                },
              }
             }
           },
           "query":  {
             "bool":  {
               "filter":  {
                 "range":  {
                   "time-field":  {
                     "format": "strict_date_time",
                     "gte": "2021-04-22T15:14:31.000Z",
                     "lt": "2021-04-22T15:20:31.000Z",
                   },
                 },
               },
             },
           },
           "size": 0,
         },
         "ignore_unavailable": true,
         "index": "index-name",
       },
       {"ignore": [404], "meta": true});
  });

  it('should create correct query when aggType!=count and termField is undefined (aggregate metric over all)', async () => {
    await timeSeriesQuery({
      ...params,
      query: {
        ...params.query,
        aggType: 'avg',
        aggField: 'avg-field'
      }
    });
    expect(esClient.search).toHaveBeenCalledWith({
         "allow_no_indices": true,
         "body":  {
           "aggs":  {
            "dateAgg":  {
              "date_range":  {
                "field": "time-field",
                "format": "strict_date_time",
                "ranges":  [
                   {
                    "from": "2021-04-22T15:14:31.000Z",
                    "to": "2021-04-22T15:19:31.000Z",
                  },
                   {
                    "from": "2021-04-22T15:15:31.000Z",
                    "to": "2021-04-22T15:20:31.000Z",
                  },
                ],
              },
              "aggs": {
                "metricAgg": {
                  "avg": {
                    "field": "avg-field"
                  }
                }
              }
            },
            "sortValueAgg": {
              "avg": {
                "field": "avg-field"
              }
            }
           },
           "query":  {
             "bool":  {
               "filter":  {
                 "range":  {
                   "time-field":  {
                     "format": "strict_date_time",
                     "gte": "2021-04-22T15:14:31.000Z",
                     "lt": "2021-04-22T15:20:31.000Z",
                   },
                 },
               },
             },
           },
           "size": 0,
         },
         "ignore_unavailable": true,
         "index": "index-name",
       },
       {"ignore": [404], "meta": true});
  });

  it('should create correct query when aggType!=count and termField is specified (aggregate metric over top N termField)', async () => {
    await timeSeriesQuery({
      ...params,
      query: {
        ...params.query,
        aggType: 'avg',
        aggField: 'avg-field',
        termField: 'the-field',
        termSize: 20,
      }
    });
    expect(esClient.search).toHaveBeenCalledWith({
         "allow_no_indices": true,
         "body":  {
           "aggs":  {
            "groupCardinalityAgg": {
              "cardinality": {
                "field": "the-field"
              }
            },
            "groupAgg": {
              "terms": {
                "field": "the-field",
                "order": {
                               "sortValueAgg": "desc",
                             },
                "size": 20
              },
              "aggs": {
                "dateAgg":  {
                  "date_range":  {
                    "field": "time-field",
                    "format": "strict_date_time",
                    "ranges":  [
                       {
                        "from": "2021-04-22T15:14:31.000Z",
                        "to": "2021-04-22T15:19:31.000Z",
                      },
                       {
                        "from": "2021-04-22T15:15:31.000Z",
                        "to": "2021-04-22T15:20:31.000Z",
                      },
                    ],
                  },
                  "aggs": {
                    "metricAgg": {
                      "avg": {
                        "field": "avg-field"
                      }
                    }
                  }
                },
                "sortValueAgg": {
                  "avg": {
                    "field": "avg-field"
                  }
                }
              }
             }
           },
           "query":  {
             "bool":  {
               "filter":  {
                 "range":  {
                   "time-field":  {
                     "format": "strict_date_time",
                     "gte": "2021-04-22T15:14:31.000Z",
                     "lt": "2021-04-22T15:20:31.000Z",
                   },
                 },
               },
             },
           },
           "size": 0,
         },
         "ignore_unavailable": true,
         "index": "index-name",
       },
       {"ignore": [404], "meta": true});
  });

  it('should apply the termLimit if specified', async () => {
    await timeSeriesQuery({
      ...params,
      query: {
        ...params.query,
        termField: 'the-term',
        termSize: 100,
      },
      termLimit: 5,
    });
    expect(esClient.search).toHaveBeenCalledWith({
         "allow_no_indices": true,
         "body":  {
           "aggs":  {
            "groupCardinalityAgg": {
              "cardinality": {
                "field": "the-term"
              }
            },
             "groupAgg": {
              "terms": {
                "field": "the-term",
                "size": 5
              },
              "aggs": {
                "dateAgg":  {
                  "date_range":  {
                    "field": "time-field",
                    "format": "strict_date_time",
                    "ranges":  [
                       {
                        "from": "2021-04-22T15:14:31.000Z",
                        "to": "2021-04-22T15:19:31.000Z",
                      },
                       {
                        "from": "2021-04-22T15:15:31.000Z",
                        "to": "2021-04-22T15:20:31.000Z",
                      },
                    ],
                  },
                },
              }
             }
           },
           "query":  {
             "bool":  {
               "filter":  {
                 "range":  {
                   "time-field":  {
                     "format": "strict_date_time",
                     "gte": "2021-04-22T15:14:31.000Z",
                     "lt": "2021-04-22T15:20:31.000Z",
                   },
                 },
               },
             },
           },
           "size": 0,
         },
         "ignore_unavailable": true,
         "index": "index-name",
       },
       {"ignore": [404], "meta": true});
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
      truncated: false,
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
      truncated: false,
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
          groupCardinalityAgg: {
            value: 2
          },
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
      truncated: false,
    });
  });

  it('correctly parses time series results for group aggregation when group cardinality is greater than termLimt', () => {
    expect(
      getResultFromEs(false, true, {
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 298, relation: 'eq' }, hits: [] },
        aggregations: {
          groupCardinalityAgg: {
            value: 20
          },
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
      } as estypes.SearchResponse<unknown>, 2)
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
      truncated: true,
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
      truncated: false
    });
  });
});
