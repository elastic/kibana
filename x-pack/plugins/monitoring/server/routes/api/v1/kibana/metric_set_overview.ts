/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricDescriptor } from '../../../../lib/details/get_metrics';

export const metricSet: MetricDescriptor[] = [
  'kibana_cluster_requests',
  {
    keys: ['kibana_cluster_max_response_times', 'kibana_cluster_average_response_times'],
    name: 'kibana_cluster_response_times',
  },
  'kibana_cluster_rule_overdue_count',
  {
    keys: ['kibana_cluster_rule_overdue_p50', 'kibana_cluster_rule_overdue_p99'],
    name: 'kibana_cluster_rule_overdue_duration',
  },
  'kibana_cluster_action_overdue_count',
  {
    keys: ['kibana_cluster_action_overdue_p50', 'kibana_cluster_action_overdue_p99'],
    name: 'kibana_cluster_action_overdue_duration',
  },
];
