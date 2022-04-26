/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricsMap } from './metrics_to_api_options';
import { metricsToApiOptions } from './metrics_to_api_options';

describe('metricsToApiOptions', () => {
  type TestNodeTypeMetricsField = 'test.node.type.field1' | 'test.node.type.field2';

  const testMetricsMapField1First: MetricsMap<TestNodeTypeMetricsField> = {
    'test.node.type.field1': {
      aggregation: 'max',
      field: 'test.node.type.field1',
    },
    'test.node.type.field2': {
      aggregation: 'avg',
      field: 'test.node.type.field2',
    },
  };

  const testMetricsMapField1Second: MetricsMap<TestNodeTypeMetricsField> = {
    'test.node.type.field2': {
      aggregation: 'avg',
      field: 'test.node.type.field2',
    },
    'test.node.type.field1': {
      aggregation: 'max',
      field: 'test.node.type.field1',
    },
  };

  const fields = ['test.node.type.field1', 'test.node.type.field2'];

  it('should join the grouping field with the metrics in the APIs expected format', () => {
    const { options } = metricsToApiOptions(
      testMetricsMapField1First,
      'test.node.type.groupingField'
    );
    expect(options).toEqual({
      aggregation: 'avg',
      groupBy: 'test.node.type.groupingField',
      metrics: [
        {
          field: 'test.node.type.field1',
          aggregation: 'max',
        },
        {
          field: 'test.node.type.field2',
          aggregation: 'avg',
        },
      ],
    });
  });

  it('should provide a mapping object that allows consumer to ignore metric definition order', () => {
    const field1First = metricsToApiOptions(
      testMetricsMapField1First,
      'test.node.type.groupingField'
    );

    assertListContentIsEqual(Object.keys(field1First.metricByField), fields);
    expect(field1First.metricByField).toEqual({
      'test.node.type.field1': 'metric_0',
      'test.node.type.field2': 'metric_1',
    });

    const field1Second = metricsToApiOptions(
      testMetricsMapField1Second,
      'test.node.type.groupingField'
    );

    assertListContentIsEqual(Object.keys(field1Second.metricByField), fields);
    expect(field1Second.metricByField).toEqual({
      'test.node.type.field1': 'metric_1',
      'test.node.type.field2': 'metric_0',
    });
  });

  function assertListContentIsEqual(firstList: string[], secondList: string[]) {
    const firstListAsSet = new Set(firstList);
    const secondListAsSet = new Set(secondList);

    expect(firstListAsSet).toEqual(secondListAsSet);
    expect(firstList.length).toBe(secondList.length);
  }
});
