/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { isEmpty } from 'lodash';
import { MetricExpressionCustomMetric } from '../../common/alerting/metrics';
import { MetricsExplorerCustomMetric } from '../../common/http_api';

const isMetricExpressionCustomMetric = (
  subject: MetricsExplorerCustomMetric | MetricExpressionCustomMetric
): subject is MetricExpressionCustomMetric => {
  return (subject as MetricExpressionCustomMetric).aggType != null;
};

export const createCustomMetricsAggregations = (
  id: string,
  customMetrics: Array<MetricsExplorerCustomMetric | MetricExpressionCustomMetric>,
  equation?: string
) => {
  const bucketsPath: { [id: string]: string } = {};
  const metricAggregations = customMetrics.reduce((acc, metric) => {
    const key = `${id}_${metric.name}`;
    const aggregation = isMetricExpressionCustomMetric(metric)
      ? metric.aggType
      : metric.aggregation;

    if (aggregation === 'count') {
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

    if (aggregation && metric.field) {
      bucketsPath[metric.name] = key;
      return {
        ...acc,
        [key]: {
          [aggregation]: { field: metric.field },
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
