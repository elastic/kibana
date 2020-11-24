/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';

import { assertUnreachable } from '../../../../../../common/utility_types';
import {
  Direction,
  SortField,
  NetworkDnsRequestOptions,
  NetworkDnsFields,
} from '../../../../../../common/search_strategy';
import { createQueryFilterClauses } from '../../../../../utils/build_query';

type QueryOrder =
  | { _count: Direction }
  | { _key: Direction }
  | { unique_domains: Direction }
  | { dns_bytes_in: Direction }
  | { dns_bytes_out: Direction };

const getQueryOrder = (sort: SortField<NetworkDnsFields>): QueryOrder => {
  switch (sort.field) {
    case NetworkDnsFields.queryCount:
      return { _count: sort.direction };
    case NetworkDnsFields.dnsName:
      return { _key: sort.direction };
    case NetworkDnsFields.uniqueDomains:
      return { unique_domains: sort.direction };
    case NetworkDnsFields.dnsBytesIn:
      return { dns_bytes_in: sort.direction };
    case NetworkDnsFields.dnsBytesOut:
      return { dns_bytes_out: sort.direction };
  }
  assertUnreachable(sort.field);
};

const getCountAgg = () => ({
  dns_count: {
    cardinality: {
      field: 'dns.question.registered_domain',
    },
  },
});

const createIncludePTRFilter = (isPtrIncluded: boolean) =>
  isPtrIncluded
    ? {}
    : {
        must_not: [
          {
            term: {
              'dns.question.type': {
                value: 'PTR',
              },
            },
          },
        ],
      };

export const buildDnsQuery = ({
  defaultIndex,
  docValueFields,
  filterQuery,
  isPtrIncluded,
  sort,
  pagination: { querySize },
  stackByField = 'dns.question.registered_domain',
  timerange: { from, to },
}: NetworkDnsRequestOptions) => {
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
    allowNoIndices: true,
    index: defaultIndex,
    ignoreUnavailable: true,
    body: {
      ...(!isEmpty(docValueFields) ? { docvalue_fields: docValueFields } : {}),
      aggregations: {
        ...getCountAgg(),
        dns_name_query_count: {
          terms: {
            field: stackByField,
            size: querySize,
            order: {
              ...getQueryOrder(sort),
            },
          },
          aggs: {
            unique_domains: {
              cardinality: {
                field: 'dns.question.name',
              },
            },
            dns_bytes_in: {
              sum: {
                field: 'source.bytes',
              },
            },
            dns_bytes_out: {
              sum: {
                field: 'destination.bytes',
              },
            },
          },
        },
      },
      query: {
        bool: {
          filter,
          ...createIncludePTRFilter(isPtrIncluded),
        },
      },
    },
    size: 0,
    track_total_hits: false,
  };

  return dslQuery;
};
