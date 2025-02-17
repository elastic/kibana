/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Aggregators } from '@kbn/observability-plugin/common/custom_threshold_rule/types';
import { COMPARATORS } from '@kbn/alerting-comparators';

export const scenario2 = {
  dataView: {
    indexPattern: 'high-cardinality-data-fake_hosts.fake_hosts-*',
    id: 'data-view-id',
    shouldCreate: false,
  },
  ruleParams: {
    consumer: 'logs',
    name: 'custom_threshold_log_count_groupby',
    params: {
      criteria: [
        {
          comparator: COMPARATORS.LESS_THAN,
          threshold: [40],
          timeSize: 1,
          timeUnit: 'm',
          metrics: [{ name: 'A', filter: '', aggType: Aggregators.COUNT }],
        },
      ],
      groupBy: ['event.dataset'],
      searchConfiguration: {
        query: {
          query: 'labels.scenario: custom_threshold_log_count_groupby',
        },
      },
    },
  },
};
