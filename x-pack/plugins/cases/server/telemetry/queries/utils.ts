/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getCountsAggregationQuery = (savedObjectType: string) => ({
  counts: {
    date_range: {
      field: `${savedObjectType}.attributes.created_at`,
      format: 'dd/MM/YYYY',
      ranges: [
        { from: 'now-1d', to: 'now' },
        { from: 'now-1w', to: 'now' },
        { from: 'now-1M', to: 'now' },
      ],
    },
  },
});
