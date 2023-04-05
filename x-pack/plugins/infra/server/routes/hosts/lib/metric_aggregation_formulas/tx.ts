/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { estypes } from '@elastic/elasticsearch';
import { FILTER_AGGREGATION_SUB_AGG_NAME } from '../constants';
import { HostsMetricsAggregationQueryConfig } from '../types';

const FIELD_NAME = 'tx_bytes_per_period';
const FILTER: estypes.QueryDslQueryContainer = {
  bool: {
    filter: [
      {
        exists: {
          field: 'host.network.egress.bytes',
        },
      },
    ],
  },
};

export const tx: HostsMetricsAggregationQueryConfig = {
  fieldName: FIELD_NAME,
  filter: FILTER,
  runtimeField: {
    [FIELD_NAME]: {
      type: 'double',
      script: `
          emit((doc['host.network.egress.bytes'].value/(doc['metricset.period'].value / 1000)));
        `,
    },
  },
  aggregation: {
    filter: FILTER,
    aggs: {
      [FILTER_AGGREGATION_SUB_AGG_NAME]: {
        avg: {
          field: FIELD_NAME,
        },
      },
    },
  },
};
