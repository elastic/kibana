/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricDescriptor } from '../../../../lib/details/get_metrics';

export const metricSet: MetricDescriptor[] = [
  'cluster_search_request_rate',
  'cluster_query_latency',
  {
    keys: ['cluster_index_request_rate_total', 'cluster_index_request_rate_primary'],
    name: 'cluster_index_request_rate',
  },
  'cluster_index_latency',
];
