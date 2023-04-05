/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { FILTER_AGGREGATION_SUB_AGG_NAME } from '../constants';
import { HostsMetricsAggregationQueryConfig } from '../types';

const FIELD_NAME = 'cpu_usage';
const FILTER: estypes.QueryDslQueryContainer = {
  bool: {
    must: [
      {
        exists: {
          field: 'system.cpu.user.pct',
        },
      },
      {
        exists: {
          field: 'system.cpu.system.pct',
        },
      },
      {
        exists: {
          field: 'system.cpu.cores',
        },
      },
    ],
  },
};

export const cpu: HostsMetricsAggregationQueryConfig = {
  fieldName: FIELD_NAME,
  filter: FILTER,
  runtimeField: {
    [FIELD_NAME]: {
      type: 'double',
      script: `
        emit((doc['system.cpu.user.pct'].value + doc['system.cpu.system.pct'].value) / (doc['system.cpu.cores'].value)); 
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
