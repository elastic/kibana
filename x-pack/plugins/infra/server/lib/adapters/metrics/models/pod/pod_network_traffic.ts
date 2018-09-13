/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraMetricModelCreator, InfraMetricModelMetricType } from '../../adapter_types';

export const podNetworkTraffic: InfraMetricModelCreator = (timeField, indexPattern, interval) => ({
  id: 'podNetworkTraffic',
  requires: 'kubernetes.pod',
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'timeseries',
  series: [
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
    {
      id: 'rx',
      split_mode: 'everything',
      metrics: [
        {
          field: 'kubernetes.pod.network.rx.bytes',
          id: '12786481-0b96-11e8-80a8-fddde751524a',
          type: InfraMetricModelMetricType.max,
        },
        {
          field: '12786481-0b96-11e8-80a8-fddde751524a',
          id: '12786482-0b96-11e8-80a8-fddde751524a',
          type: InfraMetricModelMetricType.derivative,
          unit: '1s',
        },
        {
          field: '12786482-0b96-11e8-80a8-fddde751524a',
          id: '12786483-0b96-11e8-80a8-fddde751524a',
          type: InfraMetricModelMetricType.positive_only,
          unit: '',
        },
        {
          id: '1ca75b50-0b96-11e8-80a8-fddde751524a',
          script: 'params.rate * -1',
          type: InfraMetricModelMetricType.calculation,
          variables: [
            {
              field: '12786483-0b96-11e8-80a8-fddde751524a',
              id: '1e019420-0b96-11e8-80a8-fddde751524a',
              name: 'rate',
            },
          ],
        },
      ],
    },
  ],
});
