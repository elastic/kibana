/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { isEmpty } from 'lodash';
import { CustomThresholdExpressionMetric } from '../../../../../common/custom_threshold_rule/types';

export const createCustomMetricsAggregations = (
  id: string,
  customMetrics: CustomThresholdExpressionMetric[],
  equation?: string
) => {
  const bucketsPath: { [id: string]: string } = {};
  const metricAggregations = customMetrics.reduce((acc, metric) => {
    const key = `${id}_${metric.name}`;
    const aggregation = metric.aggType;

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
    return acc.replaceAll(key, `params.${key}`);
  }, workingEquation);
};
