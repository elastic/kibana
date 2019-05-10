/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AggregationSearchResponse } from 'elasticsearch';
import { MetricsAggs, MetricSeriesKeys, AggValue } from './types';
import { transformDataToMetricsChart } from './transform_metrics_chart';
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
