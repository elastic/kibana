/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BUCKET_KEY, MAX_SIZE } from '../constants';
import { createFilters } from '../helpers/query';
import { GetHostsArgs } from '../types';
import { assertQueryStructure } from '../utils';

export const getFilteredHosts = async ({ infraMetricsClient, params }: GetHostsArgs) => {
  assertQueryStructure(params.query);

  return infraMetricsClient.search({
    allow_no_indices: true,
    ignore_unavailable: true,
    body: {
      size: 0,
      track_total_hits: false,
      query: {
        bool: {
          ...params.query.bool,
          filter: createFilters({ params, extraFilter: params.query }),
        },
      },
      aggs: {
        nodes: {
          terms: {
            size: params.limit ?? MAX_SIZE,
            field: BUCKET_KEY,
            order: {
              _key: 'asc',
            },
          },
        },
      },
    },
  });
};
