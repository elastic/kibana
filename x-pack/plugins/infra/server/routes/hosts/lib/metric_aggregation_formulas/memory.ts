/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HostsMetricsAggregationQueryConfig } from '../types';

const FIELD_NAME = 'system.memory.actual.used.pct';

export const memory: HostsMetricsAggregationQueryConfig = {
  fieldName: FIELD_NAME,
  aggregation: {
    avg: {
      field: FIELD_NAME,
    },
  },
};
