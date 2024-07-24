/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { GetHostParameters } from '../types';
import { BUCKET_KEY } from '../constants';
import { createFilters } from '../helpers/query';

export const getFilteredHosts = async ({
  infraMetricsClient,
  from,
  to,
  limit,
  query,
}: {
  infraMetricsClient: GetHostParameters['infraMetricsClient'];
  from: string;
  to: string;
  limit: number;
  query: estypes.QueryDslQueryContainer;
}) => {
  const response = await infraMetricsClient.search({
    allow_no_indices: true,
    ignore_unavailable: true,
    body: {
      size: 0,
      track_total_hits: false,
      query: {
        bool: {
          filter: createFilters({ from, to, query }),
        },
      },
      aggs: {
        nodes: {
          terms: {
            size: limit,
            field: BUCKET_KEY,
            order: {
              _key: 'asc',
            },
          },
        },
      },
    },
  });

  const { nodes } = response.aggregations ?? {};
  return nodes?.buckets.map((p) => p.key as string) ?? [];
};
