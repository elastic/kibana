/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HostsKpiHostsRequestOptions } from '../../../../../../../common/search_strategy/security_solution/hosts';
import { createQueryFilterClauses } from '../../../../../../utils/build_query';

export const buildTotalUsersKpiQuery = ({
  filterQuery,
  timerange: { from, to },
  defaultIndex,
}: HostsKpiHostsRequestOptions) => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    {
      range: {
        '@timestamp': {
          gte: from,
          lte: to,
          format: 'strict_date_optional_time',
        },
      },
    },
  ];

  const dslQuery = {
    index: defaultIndex,
    allow_no_indices: true,
    ignore_unavailable: true,
    track_total_hits: false,
    body: {
      aggregations: {
        users: {
          cardinality: {
            field: 'user.name',
          },
        },
        users_histogram: {
          auto_date_histogram: {
            field: '@timestamp',
            buckets: 6,
          },
          aggs: {
            count: {
              cardinality: {
                field: 'user.name',
              },
            },
          },
        },
      },
      query: {
        bool: {
          filter,
        },
      },
      size: 0,
    },
  };

  return dslQuery;
};
