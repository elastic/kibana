/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createQueryFilterClauses } from '../../../../../utils/build_query';

import { NetworkHttpRequestOptions, SortField } from '../../../../../../common/search_strategy';

const getCountAgg = () => ({
  http_count: {
    cardinality: {
      field: 'url.path',
    },
  },
});

export const buildHttpQuery = ({
  defaultIndex,
  filterQuery,
  sort,
  pagination: { querySize },
  timerange: { from, to },
  ip,
}: NetworkHttpRequestOptions) => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    {
      range: {
        '@timestamp': { gte: from, lte: to, format: 'strict_date_optional_time' },
      },
    },
    { exists: { field: 'http.request.method' } },
  ];

  const dslQuery = {
    allow_no_indices: true,
    index: defaultIndex,
    ignore_unavailable: true,
    body: {
      aggregations: {
        ...getCountAgg(),
        ...getHttpAggs(sort, querySize),
      },
      query: {
        bool: ip
          ? {
              filter,
              should: [
                {
                  term: {
                    'source.ip': ip,
                  },
                },
                {
                  term: {
                    'destination.ip': ip,
                  },
                },
              ],
              minimum_should_match: 1,
            }
          : {
              filter,
            },
      },
    },
    size: 0,
    track_total_hits: false,
  };

  return dslQuery;
};

const getHttpAggs = (sortField: SortField, querySize: number) => ({
  url: {
    terms: {
      field: `url.path`,
      size: querySize,
      order: {
        _count: sortField.direction,
      },
    },
    aggs: {
      methods: {
        terms: {
          field: 'http.request.method',
          size: 4,
        },
      },
      domains: {
        terms: {
          field: 'url.domain',
          size: 4,
        },
      },
      status: {
        terms: {
          field: 'http.response.status_code',
          size: 4,
        },
      },
      source: {
        top_hits: {
          size: 1,
          _source: {
            includes: ['host.name', 'source.ip'],
          },
        },
      },
    },
  },
});
