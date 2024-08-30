/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Group } from '@kbn/observability-alerting-rule-utils';
import {
  CustomThresholdExpressionMetric,
  CustomThresholdSearchSourceFields,
} from '../../common/custom_threshold_rule/types';
import { MetricExpression } from '../components/custom_threshold/types';
import { getGroupFilters } from '..';

const generateLensEquation = (criterion: MetricExpression) => {
  const metricNameResolver: Record<string, string> = {};

  const aggMapping: Record<string, string> = {
    avg: 'average',
    cardinality: 'unique_count',
  };

  criterion.metrics.forEach(
    (metric: CustomThresholdExpressionMetric) =>
      (metricNameResolver[metric.name] = `${
        aggMapping[metric.aggType] ? aggMapping[metric.aggType] : metric.aggType
      }(${metric.field ? metric.field : metric.filter ? metric.filter : ''})`)
  );

  let equation = criterion.equation
    ? criterion.equation
    : criterion.metrics.map((m: any) => m.name).join('+');

  Object.keys(metricNameResolver)
    .sort()
    .reverse()
    .forEach((metricName) => {
      equation = equation.replaceAll(metricName, metricNameResolver[metricName]);
    });

  return equation;
};

export const generateInvestigationItem = (
  criterion: MetricExpression,
  searchConfiguration: CustomThresholdSearchSourceFields,
  groupBy: string | string[] | undefined,
  groups: Group[]
) => {
  const equation = generateLensEquation(criterion);
  const filters = searchConfiguration.filter || [];
  const additionalFilters = getGroupFilters(groups);
  const interval = `${criterion.timeSize}${criterion.timeUnit}`;

  const item = {
    title: equation,
    type: 'lens',
    params: {
      filters: [...filters, ...additionalFilters],
      equation,
      interval,
      searchConfiguration,
      groupBy,
    },
  };
  return item;
};
