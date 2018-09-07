/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraMetricModelCreator, InfraMetricModelMetricType } from '../../adapter_types';

export const hostNetworkTraffic: InfraMetricModelCreator = (timeField, indexPattern, interval) => ({
  id: 'hostNetworkTraffic',
  requires: 'system.network',
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'timeseries',
  series: [
    {
      id: 'tx',
      metrics: [
        {
          field: 'system.network.out.bytes',
          id: '61ca57f2-469d-11e7-af02-69e470af7417',
          type: InfraMetricModelMetricType.max,
        },
        {
          field: '61ca57f2-469d-11e7-af02-69e470af7417',
          id: 'be823190-0b76-11e8-84d7-1d34a708be9c',
          type: InfraMetricModelMetricType.derivative,
          unit: '1s',
        },
        {
          field: 'be823190-0b76-11e8-84d7-1d34a708be9c',
          id: 'c2c8dbf0-0b76-11e8-84d7-1d34a708be9c',
          type: InfraMetricModelMetricType.positive_only,
          unit: '',
        },
        {
          function: 'sum',
          id: 'c7ff2100-0b77-11e8-a6ba-c96b1f1b873f',
          type: InfraMetricModelMetricType.series_agg,
        },
      ],
      split_mode: 'terms',
      terms_field: 'system.network.name',
    },
    {
      id: 'rx',
      label: 'Inbound (RX)',
      metrics: [
        {
          field: 'system.network.in.bytes',
          id: 'cafa2e01-0b76-11e8-84d7-1d34a708be9c',
          type: InfraMetricModelMetricType.max,
        },
        {
          field: 'cafa2e01-0b76-11e8-84d7-1d34a708be9c',
          id: 'cafa2e02-0b76-11e8-84d7-1d34a708be9c',
          type: InfraMetricModelMetricType.derivative,
          unit: '1s',
        },
        {
          field: 'cafa2e02-0b76-11e8-84d7-1d34a708be9c',
          id: 'cafa2e03-0b76-11e8-84d7-1d34a708be9c',
          type: InfraMetricModelMetricType.positive_only,
          unit: '',
        },
        {
          id: 'd80060b0-0b76-11e8-84d7-1d34a708be9c',
          script: 'params.rate * -1',
          type: InfraMetricModelMetricType.calculation,
          variables: [
            {
              field: 'cafa2e03-0b76-11e8-84d7-1d34a708be9c',
              id: 'dbbbe210-0b76-11e8-84d7-1d34a708be9c',
              name: 'rate',
            },
          ],
        },
        {
          function: 'sum',
          id: 'd53f4f70-0b77-11e8-a6ba-c96b1f1b873f',
          type: InfraMetricModelMetricType.series_agg,
        },
      ],
      split_mode: 'terms',
      terms_field: 'system.network.name',
    },
  ],
});
