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
          field: 'kubernetes.container.cpu.usage.nanocores',
          id: 'avg-cpu-usage',
          type: InfraMetricModelMetricType.avg,
        },
        {
          field: 'kubernetes.container.cpu.limit.nanocores',
          id: 'max-cpu-limit',
          type: InfraMetricModelMetricType.max,
        },
        {
          id: 'calc-usage-limit',
          script: 'params.usage / params.limit',
          type: InfraMetricModelMetricType.calculation,
          variables: [
            {
              field: 'avg-cpu-usage',
              id: 'var-usage',
              name: 'usage',
            },
            {
              field: 'max-cpu-limit',
              id: 'var-limit',
              name: 'limit',
            },
          ],
        },
      ],
    },
    {
      id: 'disk',
      split_mode: 'everything',
      metrics: [
        {
          field: 'kubernetes.container.rootfs.used.bytes',
          id: 'avg-rootfs-used',
          type: InfraMetricModelMetricType.avg,
        },
        {
          field: 'kubernetes.container.rootfs.capacity.bytes',
          id: 'max-rootfs-cap',
          type: InfraMetricModelMetricType.max,
        },
        {
          id: 'calc-used-limit',
          script: 'params.used / params.limit',
          type: InfraMetricModelMetricType.calculation,
          variables: [
            {
              field: 'avg-rootfs-used',
              id: 'var-used',
              name: 'used',
            },
            {
              field: 'max-rootfs-cap',
              id: 'var-limit',
              name: 'limit',
            },
          ],
        },
      ],
    },
    {
      id: 'memory',
      split_mode: 'everything',
      metrics: [
        {
          field: 'kubernetes.container.memory.usage.bytes',
          id: 'avg-memory-usage',
          type: InfraMetricModelMetricType.avg,
        },
        {
          field: 'kubernetes.container.memory.limit.bytes',
          id: 'max-memory-cap',
          type: InfraMetricModelMetricType.max,
        },
        {
          id: 'calc-usage-limit',
          script: 'params.usage / params.limit',
          type: InfraMetricModelMetricType.calculation,
          variables: [
            {
              field: 'avg-memory-usage',
              id: 'var-usage',
              name: 'usage',
            },
            {
              field: 'max-memory-usage',
              id: 'var-limit',
              name: 'limit',
            },
          ],
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
