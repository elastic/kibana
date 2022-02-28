/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Buckets } from '../types';

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

export const getCountsFromBuckets = (buckets: Buckets['buckets']) => ({
  '1d': buckets?.[2]?.doc_count ?? 0,
  '1w': buckets?.[1]?.doc_count ?? 0,
  '1m': buckets?.[0]?.doc_count ?? 0,
});
