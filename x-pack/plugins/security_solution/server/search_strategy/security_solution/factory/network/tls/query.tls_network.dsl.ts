/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertUnreachable } from '../../../../../../common/utility_types';
import { createQueryFilterClauses } from '../../../../../utils/build_query';

import {
  Direction,
  NetworkTlsRequestOptions,
  NetworkTlsFields,
  SortField,
} from '../../../../../../common/search_strategy';

const getAggs = (querySize: number, sort: SortField<NetworkTlsFields>) => ({
  count: {
    cardinality: {
      field: 'tls.server.hash.sha1',
    },
  },
  sha1: {
    terms: {
      field: 'tls.server.hash.sha1',
      size: querySize,
      order: {
        ...getQueryOrder(sort),
      },
    },
    aggs: {
      issuers: {
        terms: {
          field: 'tls.server.issuer',
        },
      },
      subjects: {
        terms: {
          field: 'tls.server.subject',
        },
      },
      not_after: {
        terms: {
          field: 'tls.server.not_after',
        },
      },
      ja3: {
        terms: {
          field: 'tls.client.ja3',
        },
      },
    },
  },
});

export const buildNetworkTlsQuery = ({
  ip,
  sort,
  filterQuery,
  flowTarget,
  pagination: { querySize },
  defaultIndex,
  timerange: { from, to },
}: NetworkTlsRequestOptions) => {
  const defaultFilter = [
    ...createQueryFilterClauses(filterQuery),
    {
      range: {
        '@timestamp': { gte: from, lte: to, format: 'strict_date_optional_time' },
      },
    },
  ];

  const filter = ip ? [...defaultFilter, { term: { [`${flowTarget}.ip`]: ip } }] : defaultFilter;

  const dslQuery = {
    allow_no_indices: true,
    index: defaultIndex,
    ignore_unavailable: true,
    track_total_hits: false,
    body: {
      aggs: {
        ...getAggs(querySize, sort),
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

interface QueryOrder {
  _key: Direction;
}

const getQueryOrder = (sort: SortField<NetworkTlsFields>): QueryOrder => {
  switch (sort.field) {
    case NetworkTlsFields._id:
      return { _key: sort.direction };
    default:
      return assertUnreachable(sort.field);
  }
};
