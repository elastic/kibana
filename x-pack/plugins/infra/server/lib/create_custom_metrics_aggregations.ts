/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { isEmpty, omit } from 'lodash';
import { MetricExpressionCustomMetric } from '../../common/alerting/metrics';
import { MetricsExplorerCustomMetric } from '../../common/http_api';

export const convertToMetricExplorerCustomMetric = (
  customMetrics: MetricExpressionCustomMetric[]
) =>
  customMetrics.map((metric) => {
    return { ...omit(metric, 'aggType'), aggregation: metric.aggType };
  });

const isMetricExpressionCustomMetric = (
  subject: any[]
): subject is MetricExpressionCustomMetric[] => {
  return subject.every((m) => m.aggType != null);
};

export const createCustomMetricsAggregations = (
  id: string,
  customMetrics: MetricsExplorerCustomMetric[] | MetricExpressionCustomMetric[],
  equation?: string
) => {
  const metrics = isMetricExpressionCustomMetric(customMetrics)
    ? convertToMetricExplorerCustomMetric(customMetrics)
    : customMetrics;
  const bucketsPath: { [id: string]: string } = {};
  const metricAggregations = metrics.reduce((acc, metric) => {
    const key = `${id}_${metric.name}`;
    if (metric.aggregation === 'count') {
      bucketsPath[metric.name] = `${key}>_count`;
      return {
        ...acc,
        [key]: {
          filter: metric.filter
            ? toElasticsearchQuery(fromKueryExpression(metric.filter))
            : { match_all: {} },
        },
      };
    }

    if (metric.aggregation && metric.field) {
      bucketsPath[metric.name] = key;
      return {
        ...acc,
        [key]: {
          [metric.aggregation]: { field: metric.field },
        },
      };
    }

    return acc;
  }, {});

  if (isEmpty(metricAggregations)) {
    return {};
  }

  return {
    ...metricAggregations,
    [id]: {
      bucket_script: {
        buckets_path: bucketsPath,
        script: {
          source: convertEquationToPainless(bucketsPath, equation),
          lang: 'painless',
        },
      },
    },
  };
};

const convertEquationToPainless = (bucketsPath: { [id: string]: string }, equation?: string) => {
  const workingEquation = equation || Object.keys(bucketsPath).join(' + ');
  return Object.keys(bucketsPath).reduce((acc, key) => {
    return acc.replace(key, `params.${key}`);
  }, workingEquation);
};
