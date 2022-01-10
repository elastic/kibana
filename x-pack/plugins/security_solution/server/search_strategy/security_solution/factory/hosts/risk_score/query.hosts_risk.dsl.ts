/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Direction, HostsRiskScoreRequestOptions } from '../../../../../../common/search_strategy';
import { createQueryFilterClauses } from '../../../../../utils/build_query';

const QUERY_SIZE = 10;

export const buildHostsRiskScoreQuery = ({
  timerange,
  hostNames,
  defaultIndex,
  filterQuery,
  limit = QUERY_SIZE,
  sortOrder = Direction.desc,
}: HostsRiskScoreRequestOptions) => {
  const filter = [...createQueryFilterClauses(filterQuery)];

  if (timerange) {
    filter.push({
      range: {
        '@timestamp': {
          gte: timerange.from,
          lte: timerange.to,
          format: 'strict_date_optional_time',
        },
      },
    });
  }

  if (hostNames) {
    filter.push({ terms: { 'host.name': hostNames } });
  }

  const dslQuery = {
    index: defaultIndex,
    allow_no_indices: false,
    ignore_unavailable: true,
    track_total_hits: false,
    size: limit,
    body: {
      query: {
        bool: {
          filter,
        },
      },
      sort: [
        {
          '@timestamp': {
            order: sortOrder,
          },
        },
      ],
    },
  };

  return dslQuery;
};
