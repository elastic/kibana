/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getSloFilterAggregations() {
  return {
    no_data: {
      filter: {
        term: {
          status: 'NO_DATA',
        },
      },
    },
    violated: {
      filter: {
        term: {
          status: 'VIOLATED',
        },
      },
    },
    degraded: {
      filter: {
        term: {
          status: 'DEGRADED',
        },
      },
    },
    healthy: {
      filter: {
        term: {
          status: 'HEALTHY',
        },
      },
    },
  };
}
