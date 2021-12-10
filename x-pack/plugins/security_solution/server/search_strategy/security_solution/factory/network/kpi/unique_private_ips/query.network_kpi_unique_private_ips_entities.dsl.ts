/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  NetworkKpiUniquePrivateIpsRequestOptions,
  UniquePrivateAttributeQuery,
} from '../../../../../../../common/search_strategy/security_solution/network';
import { createQueryFilterClauses } from '../../../../../../utils/build_query';

const getUniquePrivateIpsFilter = (attrQuery: UniquePrivateAttributeQuery) => ({
  bool: {
    should: [
      {
        term: {
          [`${attrQuery}.ip`]: '10.0.0.0/8',
        },
      },
      {
        term: {
          [`${attrQuery}.ip`]: '192.168.0.0/16',
        },
      },
      {
        term: {
          [`${attrQuery}.ip`]: '172.16.0.0/12',
        },
      },
      {
        term: {
          [`${attrQuery}.ip`]: 'fd00::/8',
        },
      },
    ],
    minimum_should_match: 1,
  },
});

const getAggs = (attrQuery: 'source' | 'destination') => ({
  [attrQuery]: {
    filter: getUniquePrivateIpsFilter(attrQuery),
    aggs: {
      unique_private_ips: {
        cardinality: {
          field: `${attrQuery}.ip`,
        },
      },
      histogram: {
        auto_date_histogram: {
          field: '@timestamp',
          buckets: '6',
        },
        aggs: {
          count: {
            cardinality: {
              field: `${attrQuery}.ip`,
            },
          },
        },
      },
    },
  },
});

export const buildUniquePrivateIpsQueryEntities = ({
  filterQuery,
  timerange: { from, to },
  defaultIndex,
}: NetworkKpiUniquePrivateIpsRequestOptions) => {
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
    allow_no_indices: true,
    index: defaultIndex,
    ignore_unavailable: true,
    track_total_hits: false,
    body: {
      aggregations: {
        ...getAggs('source'),
        ...getAggs('destination'),
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
