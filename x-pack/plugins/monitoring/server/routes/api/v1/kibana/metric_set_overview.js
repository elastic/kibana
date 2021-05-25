/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const metricSet = [
  'kibana_cluster_requests',
  {
    keys: ['kibana_cluster_max_response_times', 'kibana_cluster_average_response_times'],
    name: 'kibana_cluster_response_times',
  },
];
