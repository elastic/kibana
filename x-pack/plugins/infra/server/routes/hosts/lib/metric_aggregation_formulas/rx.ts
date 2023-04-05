/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FILTER_AGGREGATION_SUB_AGG_NAME } from '../constants';
import { HostsMetricsAggregationQueryConfig } from '../types';

const FIELD_NAME = 'rx_bytes_per_period';

export const rx: HostsMetricsAggregationQueryConfig = {
  fieldName: FIELD_NAME,
  runtimeField: {
    [FIELD_NAME]: {
      type: 'double',
      script: `
          emit((doc['host.network.ingress.bytes'].value/(doc['metricset.period'].value / 1000)));
        `,
    },
  },
  aggregation: {
    filter: {
      bool: {
        filter: [
          {
            exists: {
              field: 'host.network.ingress.bytes',
            },
          },
        ],
      },
    },
    aggs: {
      [FILTER_AGGREGATION_SUB_AGG_NAME]: {
        avg: {
          field: FIELD_NAME,
        },
      },
    },
  },
};
