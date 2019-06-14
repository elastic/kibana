/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AggregationSearchResponse } from 'elasticsearch';
import {
  MetricsAggs,
  MetricSeriesKeys,
  AggValue,
  ChartBase,
  JavaGcMetricsAggs
} from './types';
import {
  transformDataToMetricsChart,
  transformJavaGcDataToMetricsChart
} from './transform_metrics_chart';
import { ChartType, YUnit } from '../../../typings/timeseries';

test('transformDataToMetricsChart should transform an ES result into a chart object', () => {
  interface TestKeys extends MetricSeriesKeys {
    a: AggValue;
    b: AggValue;
    c: AggValue;
  }

  type R = AggregationSearchResponse<void, MetricsAggs<TestKeys>>;

  const response = {
    hits: { total: 5000 } as R['hits'],
    aggregations: {
      a: { value: 1000 },
      b: { value: 1000 },
      c: { value: 1000 },
      timeseriesData: {
        buckets: [
          {
            a: { value: 10 },
            b: { value: 10 },
            c: { value: 10 },
            key: 1
          } as R['aggregations']['timeseriesData']['buckets'][0],
          {
            a: { value: 20 },
            b: { value: 20 },
            c: { value: 20 },
            key: 2
          } as R['aggregations']['timeseriesData']['buckets'][0],
          {
            a: { value: 30 },
            b: { value: 30 },
            c: { value: 30 },
            key: 3
          } as R['aggregations']['timeseriesData']['buckets'][0]
        ]
      }
    } as R['aggregations']
  } as R;

  const chartBase = {
    title: 'Test Chart Title',
    type: 'linemark' as ChartType,
    key: 'test_chart_key',
    yUnit: 'number' as YUnit,
    series: {
      a: { title: 'Series A', color: 'red' },
      b: { title: 'Series B', color: 'blue' },
      c: { title: 'Series C', color: 'green' }
    }
  };

  const chart = transformDataToMetricsChart(response, chartBase);

  expect(chart).toMatchInlineSnapshot(`
Object {
  "key": "test_chart_key",
  "series": Array [
    Object {
      "color": "red",
      "data": Array [
        Object {
          "x": 1,
          "y": 10,
        },
        Object {
          "x": 2,
          "y": 20,
        },
        Object {
          "x": 3,
          "y": 30,
        },
      ],
      "key": "a",
      "overallValue": 1000,
      "title": "Series A",
      "type": "linemark",
    },
    Object {
      "color": "blue",
      "data": Array [
        Object {
          "x": 1,
          "y": 10,
        },
        Object {
          "x": 2,
          "y": 20,
        },
        Object {
          "x": 3,
          "y": 30,
        },
      ],
      "key": "b",
      "overallValue": 1000,
      "title": "Series B",
      "type": "linemark",
    },
    Object {
      "color": "green",
      "data": Array [
        Object {
          "x": 1,
          "y": 10,
        },
        Object {
          "x": 2,
          "y": 20,
        },
        Object {
          "x": 3,
          "y": 30,
        },
      ],
      "key": "c",
      "overallValue": 1000,
      "title": "Series C",
      "type": "linemark",
    },
  ],
  "title": "Test Chart Title",
  "totalHits": 5000,
  "yUnit": "number",
}
`);
});

describe('transformJavaGcDataToMetricsChart', () => {
  describe.skip('dev', () => {
    it('should work', () => {
      const javaGCRateMetricsChart = transformJavaGcDataToMetricsChart<
        JavaGCRateMetricsSeriesAggs
      >(apiResponse, chartBase);
      expect(javaGCRateMetricsChart).toHaveProperty('title', chartBase.title);
    });
  });
});

export type JavaGCRateMetricsSeriesAggs =
  | { [P in keyof typeof chartBaseSeries]: AggValue }
  | MetricSeriesKeys;

export const chartBaseSeries = {
  gcCountAll: {
    title: 'GC activity',
    color: 'blue'
  }
};
export const chartBase: ChartBase<JavaGCRateMetricsSeriesAggs> = {
  title: 'Garbage collection rate',
  key: 'gc_rate_line_chart',
  type: 'linemark',
  yUnit: 'number',
  series: chartBaseSeries
};
export const apiResponse: AggregationSearchResponse<
  void,
  JavaGcMetricsAggs<JavaGCRateMetricsSeriesAggs>
> = {
  took: 5,
  timed_out: false,
  _shards: {
    total: 2,
    successful: 2,
    skipped: 0,
    failed: 0
  },
  hits: {
    // total: {
    //   value: 9744,
    //   relation: 'eq'
    // },
    total: 9744,
    // max_score: null,
    max_score: 0,
    hits: []
  },
  aggregations: {
    perLabelName: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: 'G1 Old Generation',
          doc_count: 3248,
          perAgent: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'd193abcc-9a88-4105-b647-864d466319a7',
                doc_count: 3248,
                timeseriesData: {
                  buckets: [
                    {
                      key_as_string: '2019-06-11T23:40:00.000Z',
                      key: 1560296400000,
                      doc_count: 0,
                      gcCountMax: {
                        value: null
                      },
                      gcCountAll: {
                        value: 0
                      }
                    },
                    {
                      key_as_string: '2019-06-11T23:50:00.000Z',
                      key: 1560297000000,
                      doc_count: 3,
                      gcCountMax: {
                        value: 0
                      },
                      gcCountAll: {
                        value: 0
                      },
                      gcCount: {
                        value: 0
                      }
                    },
                    {
                      key_as_string: '2019-06-12T00:00:00.000Z',
                      key: 1560297600000,
                      doc_count: 20,
                      gcCountMax: {
                        value: 0
                      },
                      gcCountAll: {
                        value: 0
                      },
                      gcCount: {
                        value: 0
                      }
                    }
                  ]
                },
                gcCountAll: {
                  value: 0
                }
              }
            ]
          }
        },
        {
          key: 'G1 Young Generation',
          doc_count: 3248,
          perAgent: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'd193abcc-9a88-4105-b647-864d466319a7',
                doc_count: 3248,
                timeseriesData: {
                  buckets: [
                    {
                      key_as_string: '2019-06-11T23:40:00.000Z',
                      key: 1560296400000,
                      doc_count: 0,
                      gcCountMax: {
                        value: null
                      },
                      gcCountAll: {
                        value: 0
                      }
                    },
                    {
                      key_as_string: '2019-06-11T23:50:00.000Z',
                      key: 1560297000000,
                      doc_count: 3,
                      gcCountMax: {
                        value: 29
                      },
                      gcCountAll: {
                        value: 0
                      },
                      gcCount: {
                        value: 29
                      }
                    },
                    {
                      key_as_string: '2019-06-12T00:00:00.000Z',
                      key: 1560297600000,
                      doc_count: 20,
                      gcCountMax: {
                        value: 49
                      },
                      gcCountAll: {
                        value: 20
                      },
                      gcCount: {
                        value: 49
                      }
                    }
                  ]
                },
                gcCountAll: {
                  value: 20
                }
              }
            ]
          }
        }
      ]
    }
  }
};
