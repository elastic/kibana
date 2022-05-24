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

/*
They key part of this file is the function 'createFieldLookup'.

The metrics_explorer endpoint expects a list of the metrics to use, like this:
[
  { field: 'some.metric.field', aggregation: 'avg' },
  { field: 'some.other.metric.field', aggregation: 'min' },
]

The API then responds with a series, which is a list of rows (buckets from a date_histogram 
aggregation), where each bucket has this format:
{ metric_0: 99, metric_1: 88 }

For each metric in the request, a key like metric_X is defined, and the number used is the order in
which the metric appeared in the request. So if the metric for 'some.metric.field' is first, it'll
be mapped to metric_0, but if the code changes and it is now second, it will be mapped to metric_1.

This makes the code that consumes the API response fragile to such re-ordering, the types and 
functions in this file are used to reduce this fragility and allowing consuming code to reference
the metrics by their field names instead. 
The returned metricByField object, handles the translation from field name to "index name".
For example, in the transform function passed to useInfrastructureNodeMetrics it can be used
to find a field metric like this:
row[metricByField['kubernetes.container.start_time']]

If the endpoint where to change its return format to:
{ 'some.metric.field': 99, 'some.other.metric.field': 88 }
Then this code would no longer be needed.
*/

// The input to this generic type is a (union) string type that defines all the fields we want to
// request metrics for. This input type serves as something like a "source of truth" for which
// fields are being used. The resulting MetricsMap and metricByField helper ensures a type safe
// usage of the metrics data returned from the API.
export type MetricsMap<T extends string> = {
  [field in T]: NodeMetricsExplorerOptionsMetric<field>;
};

// MetricsMap uses an object type to ensure each field gets defined.
// This type only ensures that the MetricsMap is defined in a way that the key matches the field
// it uses
// { 'some-field: { field: 'some-field', aggregation: 'whatever' } }
export interface NodeMetricsExplorerOptionsMetric<Field extends string>
  extends Omit<MetricsExplorerOptionsMetric, 'field'> {
  field: Field;
}

export function metricsToApiOptions<T extends string>(metricsMap: MetricsMap<T>, groupBy: string) {
  const metrics = Object.values(metricsMap) as Array<NodeMetricsExplorerOptionsMetric<T>>;

  const options: MetricsExplorerOptions = {
    aggregation: 'avg',
    groupBy,
    metrics,
  };

  const metricByField = createFieldLookup(Object.keys(metricsMap) as T[], metrics);

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
