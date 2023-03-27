/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HostsAggregationQuery } from '../types';

export const memory: HostsAggregationQuery = {
  aggregation: {
    memory: {
      avg: {
        field: 'system.memory.actual.used.pct',
      },
    },
  },
};
