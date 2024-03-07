/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { metricCustomDocCountMetric, MetricCustomIndicator } from '@kbn/slo-schema';
import { getElasticsearchQueryOrThrow } from '../transform_generators';

type MetricCustomMetricDef =
  | MetricCustomIndicator['params']['good']
  | MetricCustomIndicator['params']['total'];

export class GetCustomMetricIndicatorAggregation {
  constructor(private indicator: MetricCustomIndicator) {}

  private buildMetricAggregations(type: 'good' | 'total', metricDef: MetricCustomMetricDef) {
    return metricDef.metrics.reduce((acc, metric) => {
      const filter = metric.filter
        ? getElasticsearchQueryOrThrow(metric.filter)
        : { match_all: {} };

      if (metricCustomDocCountMetric.is(metric)) {
        return {
          ...acc,
          [`_${type}_${metric.name}`]: {
            filter,
          },
        };
      }

      return {
        ...acc,
        [`_${type}_${metric.name}`]: {
          filter,
          aggs: {
            metric: {
              [metric.aggregation]: { field: metric.field },
            },
          },
        },
      };
    }, {});
  }

  private convertEquationToPainless(bucketsPath: Record<string, string>, equation: string) {
    const workingEquation = equation || Object.keys(bucketsPath).join(' + ');
    return Object.keys(bucketsPath).reduce((acc, key) => {
      return acc.replaceAll(key, `params.${key}`);
    }, workingEquation);
  }

  private buildMetricEquation(type: 'good' | 'total', metricDef: MetricCustomMetricDef) {
    const bucketsPath = metricDef.metrics.reduce((acc, metric) => {
      const path = metricCustomDocCountMetric.is(metric) ? '_count' : 'metric';
      return { ...acc, [metric.name]: `_${type}_${metric.name}>${path}` };
    }, {});

    return {
      bucket_script: {
        buckets_path: bucketsPath,
        script: {
          source: this.convertEquationToPainless(bucketsPath, metricDef.equation),
          lang: 'painless',
        },
      },
    };
  }

  public execute({ type, aggregationKey }: { type: 'good' | 'total'; aggregationKey: string }) {
    const indicatorDef = this.indicator.params[type];
    return {
      ...this.buildMetricAggregations(type, indicatorDef),
      [aggregationKey]: this.buildMetricEquation(type, indicatorDef),
    };
  }
}
