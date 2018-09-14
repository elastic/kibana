/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraMetricModelCreator, InfraMetricModelMetricType } from '../../adapter_types';

export const podOverview: InfraMetricModelCreator = (timeField, indexPattern, interval) => ({
  id: 'podOverview',
  requires: 'kubernetes.pod',
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'timeseries',
  series: [
    {
      id: 'cpu',
      split_mode: 'everything',
      metrics: [
        {
          field: 'kubernetes.pod.cpu.usage.node.pct',
          id: 'avg-cpu-usage',
          type: InfraMetricModelMetricType.avg,
        },
      ],
    },
    {
      id: 'memory',
      split_mode: 'everything',
      metrics: [
        {
          field: 'kubernetes.pod.memory.usage.node.pct',
          id: 'avg-memory-usage',
          type: InfraMetricModelMetricType.avg,
        },
      ],
    },
    {
      id: 'rx',
      split_mode: 'everything',
      metrics: [
        {
          field: 'kubernetes.pod.network.rx.bytes',
          id: 'max-network-rx',
          type: InfraMetricModelMetricType.max,
        },
        {
          field: 'max-network-rx',
          id: 'deriv-max-network-rx',
          type: InfraMetricModelMetricType.derivative,
          unit: '1s',
        },
        {
          field: 'deriv-max-network-rx',
          id: 'posonly-deriv-max-network-rx',
          type: InfraMetricModelMetricType.positive_only,
          unit: '',
        },
      ],
    },
    {
      id: 'tx',
      split_mode: 'everything',
      metrics: [
        {
          field: 'kubernetes.pod.network.tx.bytes',
          id: 'max-network-tx',
          type: InfraMetricModelMetricType.max,
        },
        {
          field: 'max-network-tx',
          id: 'deriv-max-network-tx',
          type: InfraMetricModelMetricType.derivative,
          unit: '1s',
        },
        {
          field: 'deriv-max-network-tx',
          id: 'posonly-deriv-max-network-tx',
          type: InfraMetricModelMetricType.positive_only,
          unit: '',
        },
      ],
    },
  ],
});
