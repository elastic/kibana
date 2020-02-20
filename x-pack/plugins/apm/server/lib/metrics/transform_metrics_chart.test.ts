/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { transformDataToMetricsChart } from './transform_metrics_chart';
import { ChartType, YUnit } from '../../../typings/timeseries';

test('transformDataToMetricsChart should transform an ES result into a chart object', () => {
  const response = {
    hits: { total: { value: 5000 } },
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
            key: 1,
            doc_count: 0
          },
          {
            a: { value: 20 },
            b: { value: 20 },
            c: { value: 20 },
            key: 2,
            doc_count: 0
          },
          {
            a: { value: 30 },
            b: { value: 30 },
            c: { value: 30 },
            key: 3,
            doc_count: 0
          }
        ]
      }
    }
  } as any;

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
  "noHits": false,
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
  "yUnit": "number",
}
`);
});
