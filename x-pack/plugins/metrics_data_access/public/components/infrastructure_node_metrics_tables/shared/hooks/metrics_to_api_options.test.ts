/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricsExplorerOptions } from '../../../../../common/metrics_explorer_views/types';
import {
  createMetricByFieldLookup,
  MetricsQueryOptions,
  metricsToApiOptions,
} from './metrics_to_api_options';

describe('metricsToApiOptions', () => {
  type TestNodeTypeMetricsField = 'test.node.type.field1' | 'test.node.type.field2';

  const testMetricsMapField1First: MetricsQueryOptions<TestNodeTypeMetricsField> = {
    sourceFilter: {
      term: {
        'event.module': 'test',
      },
    },
    groupByField: 'test.node.type.groupingField',
    metricsMap: {
      'test.node.type.field1': {
        aggregation: 'max',
        field: 'test.node.type.field1',
      },
      'test.node.type.field2': {
        aggregation: 'avg',
        field: 'test.node.type.field2',
      },
    },
  };

  const testMetricsMapField1Second: MetricsQueryOptions<TestNodeTypeMetricsField> = {
    sourceFilter: {
      term: {
        'event.module': 'test',
      },
    },
    groupByField: 'test.node.type.groupingField',
    metricsMap: {
      'test.node.type.field2': {
        aggregation: 'avg',
        field: 'test.node.type.field2',
      },
      'test.node.type.field1': {
        aggregation: 'max',
        field: 'test.node.type.field1',
      },
    },
  };

  const fields = ['test.node.type.field1', 'test.node.type.field2'];

  it('should join the grouping field with the metrics in the APIs expected format', () => {
    const { options } = metricsToApiOptions(testMetricsMapField1First);
    expect(options).toEqual({
      aggregation: 'avg',
      groupBy: 'test.node.type.groupingField',
      filterQuery: JSON.stringify({ bool: { filter: [{ term: { 'event.module': 'test' } }] } }),
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
    } as MetricsExplorerOptions);
  });

  it('should provide a mapping object that allows consumer to ignore metric definition order', () => {
    const metricByFieldFirst = createMetricByFieldLookup(testMetricsMapField1First.metricsMap);

    assertListContentIsEqual(Object.keys(metricByFieldFirst), fields);
    expect(metricByFieldFirst).toEqual({
      'test.node.type.field1': 'metric_0',
      'test.node.type.field2': 'metric_1',
    });

    const metricByFieldSecond = createMetricByFieldLookup(testMetricsMapField1Second.metricsMap);

    expect(metricByFieldSecond).toEqual({
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
