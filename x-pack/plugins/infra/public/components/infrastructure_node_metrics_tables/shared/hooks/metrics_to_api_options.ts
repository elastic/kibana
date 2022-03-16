/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MetricsExplorerOptions,
  MetricsExplorerOptionsMetric,
} from '../../../../pages/metrics/metrics_explorer/hooks/use_metrics_explorer_options';

export interface NodeMetricsExplorerOptionsMetric<Field extends string>
  extends Omit<MetricsExplorerOptionsMetric, 'field'> {
  field: Field;
}

export type MetricsMap<T extends string> = {
  [field in T]: NodeMetricsExplorerOptionsMetric<field>;
};

export function metricsToApiOptions<T extends string>(metricsMap: MetricsMap<T>, groupBy: string) {
  const metrics = Object.values(metricsMap) as Array<NodeMetricsExplorerOptionsMetric<T>>;
  const metricByField = createFieldLookup(Object.keys(metricsMap) as T[], metrics);

  const options: MetricsExplorerOptions = {
    aggregation: 'avg',
    groupBy,
    metrics,
  };

  return {
    options,
    metricByField,
  };
}

function createFieldLookup<T extends string>(
  fields: T[],
  metrics: Array<NodeMetricsExplorerOptionsMetric<T>>
) {
  const setMetricIndexToField = (acc: Record<T, string>, field: T) => {
    return {
      ...acc,
      [field]: fieldToMetricIndex(field, metrics),
    };
  };
  return fields.reduce(setMetricIndexToField, {} as Record<T, string>);
}

function fieldToMetricIndex<T extends string>(
  field: T,
  metrics: Array<NodeMetricsExplorerOptionsMetric<T>>
) {
  const index = metrics.findIndex((metric) => metric.field === field);

  if (index === -1) {
    throw new Error('Failed to find index for field ' + field);
  }

  return `metric_${index}`;
}
