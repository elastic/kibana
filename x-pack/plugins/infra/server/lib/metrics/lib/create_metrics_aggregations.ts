/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MetricsUIAggregation } from '../../../../common/inventory_models/types';
import { MetricsAPIRequest } from '../../../../common/http_api/metrics_api';

export const createMetricsAggregations = (options: MetricsAPIRequest): MetricsUIAggregation => {
  const { metrics } = options;
  return metrics.reduce((aggs, metric) => {
    return { ...aggs, ...metric.aggregations };
  }, {});
};
