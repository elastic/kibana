/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MetricsExplorerOptionsMetric } from '../../hooks/use_metrics_explorer_options';

export const createMetricLabel = (metric: MetricsExplorerOptionsMetric) => {
  if (metric.label) {
    return metric.label;
  }
  return `${metric.aggregation}(${metric.field || ''})`;
};
