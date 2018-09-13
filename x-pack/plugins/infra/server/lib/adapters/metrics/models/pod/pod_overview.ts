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
          id: '61ca57f2-469d-11e7-af02-69e470af7417',
          type: InfraMetricModelMetricType.avg,
        },
        {
          field: 'kubernetes.container.cpu.limit.nanocores',
          id: 'ac8e11d0-0b93-11e8-8331-63375da80574',
          type: InfraMetricModelMetricType.max,
        },
        {
          id: 'b3e00060-0b93-11e8-8331-63375da80574',
          script: 'params.usage / params.limit',
          type: InfraMetricModelMetricType.calculation,
          variables: [
            {
              field: '61ca57f2-469d-11e7-af02-69e470af7417',
              id: 'b5dc93b0-0b93-11e8-8331-63375da80574',
              name: 'usage',
            },
            {
              field: 'ac8e11d0-0b93-11e8-8331-63375da80574',
              id: 'baac1d20-0b93-11e8-8331-63375da80574',
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
          id: '61ca57f2-469d-11e7-af02-69e470af7417',
          type: InfraMetricModelMetricType.avg,
        },
        {
          field: 'kubernetes.container.rootfs.capacity.bytes',
          id: 'f4758d10-0b94-11e8-80a8-fddde751524a',
          type: InfraMetricModelMetricType.max,
        },
        {
          id: '064c81b0-0b95-11e8-80a8-fddde751524a',
          script: 'params.used / params.limit',
          type: InfraMetricModelMetricType.calculation,
          variables: [
            {
              field: '61ca57f2-469d-11e7-af02-69e470af7417',
              id: '08d46510-0b95-11e8-80a8-fddde751524a',
              name: 'used',
            },
            {
              field: 'f4758d10-0b94-11e8-80a8-fddde751524a',
              id: '0d108820-0b95-11e8-80a8-fddde751524a',
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
          id: '61ca57f2-469d-11e7-af02-69e470af7417',
          type: InfraMetricModelMetricType.avg,
        },
        {
          field: 'kubernetes.container.memory.limit.bytes',
          id: '1666eeb0-0b94-11e8-8331-63375da80574',
          type: InfraMetricModelMetricType.max,
        },
        {
          id: '1f1a4200-0b94-11e8-8331-63375da80574',
          script: 'params.usage / params.limit',
          type: InfraMetricModelMetricType.calculation,
          variables: [
            {
              field: '61ca57f2-469d-11e7-af02-69e470af7417',
              id: '216199f0-0b94-11e8-8331-63375da80574',
              name: 'usage',
            },
            {
              field: '1666eeb0-0b94-11e8-8331-63375da80574',
              id: '2667c3c0-0b94-11e8-8331-63375da80574',
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
          id: '61ca57f2-469d-11e7-af02-69e470af7417',
          type: InfraMetricModelMetricType.max,
        },
        {
          field: '61ca57f2-469d-11e7-af02-69e470af7417',
          id: 'f3795d50-0b95-11e8-80a8-fddde751524a',
          type: InfraMetricModelMetricType.derivative,
          unit: '1s',
        },
        {
          field: 'f3795d50-0b95-11e8-80a8-fddde751524a',
          id: 'f76bf440-0b95-11e8-80a8-fddde751524a',
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
          id: '61ca57f2-469d-11e7-af02-69e470af7417',
          type: InfraMetricModelMetricType.max,
        },
        {
          field: '61ca57f2-469d-11e7-af02-69e470af7417',
          id: 'f3795d50-0b95-11e8-80a8-fddde751524a',
          type: InfraMetricModelMetricType.derivative,
          unit: '1s',
        },
        {
          field: 'f3795d50-0b95-11e8-80a8-fddde751524a',
          id: 'f76bf440-0b95-11e8-80a8-fddde751524a',
          type: InfraMetricModelMetricType.positive_only,
          unit: '',
        },
      ],
    },
  ],
});
