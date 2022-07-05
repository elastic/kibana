/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertMetricToMetricsAPIMetric } from './convert_metric_to_metrics_api_metric';
import {
  MetricsExplorerMetric,
  MetricsAPIMetric,
  MetricsExplorerAggregation,
} from '../../../../common/http_api';

describe('convertMetricToMetricsAPIMetric(metric, index)', () => {
  const runTest = (metric: MetricsExplorerMetric, aggregation: MetricsAPIMetric) =>
    it(`should convert ${metric.aggregation}`, () => {
      expect(convertMetricToMetricsAPIMetric(metric, 1)).toEqual(aggregation);
    });

  const runTestForBasic = (aggregation: MetricsExplorerAggregation) =>
    runTest(
      { aggregation, field: 'system.cpu.user.pct' },
      {
        id: 'metric_1',
        aggregations: { metric_1: { [aggregation]: { field: 'system.cpu.user.pct' } } },
      }
    );

  runTestForBasic('avg');
  runTestForBasic('sum');
  runTestForBasic('max');
  runTestForBasic('min');
  runTestForBasic('cardinality');

  runTest(
    { aggregation: 'rate', field: 'system.network.in.bytes' },
    {
      id: 'metric_1',
      aggregations: {
        metric_1_max: {
          max: {
            field: 'system.network.in.bytes',
          },
        },
        metric_1_deriv: {
          derivative: {
            buckets_path: 'metric_1_max',
            gap_policy: 'skip',
            unit: '1s',
          },
        },
        metric_1: {
          bucket_script: {
            buckets_path: {
              value: 'metric_1_deriv[normalized_value]',
            },
            gap_policy: 'skip',
            script: {
              lang: 'painless',
              source: 'params.value > 0.0 ? params.value : 0.0',
            },
          },
        },
      },
    }
  );

  runTest(
    { aggregation: 'count' },
    {
      id: 'metric_1',
      aggregations: {
        metric_1: {
          bucket_script: {
            buckets_path: {
              count: '_count',
            },
            gap_policy: 'skip',
            script: {
              lang: 'expression',
              source: 'count * 1',
            },
          },
        },
      },
    }
  );
});
