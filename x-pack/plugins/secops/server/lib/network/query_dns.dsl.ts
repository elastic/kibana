/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Direction, NetworkDnsDirection, NetworkDnsSortField } from '../../graphql/types';
import { createQueryFilterClauses } from '../../utils/build_query';

import { NetworkDnsRequestOptions } from './index';

type DslSort = 'asc' | 'desc';
const getDslSorting = (dir: Direction): DslSort => (dir === Direction.ascending ? 'asc' : 'desc');

const getQueryOrder = (networkDnsSortField: NetworkDnsSortField) => {
  if (networkDnsSortField.field === NetworkDnsDirection.queryCount) {
    return {
      _count: getDslSorting(networkDnsSortField.sort),
    };
  } else if (networkDnsSortField.field === NetworkDnsDirection.dnsName) {
    return {
      _key: getDslSorting(networkDnsSortField.sort),
    };
  } else if (networkDnsSortField.field === NetworkDnsDirection.uniqueDomains) {
    return {
      unique_domains: getDslSorting(networkDnsSortField.sort),
    };
  } else if (networkDnsSortField.field === NetworkDnsDirection.dnsBytesIn) {
    return {
      dns_bytes_in: getDslSorting(networkDnsSortField.sort),
    };
  } else if (networkDnsSortField.field === NetworkDnsDirection.dnsBytesOut) {
    return {
      dns_bytes_out: getDslSorting(networkDnsSortField.sort),
    };
  }
};

const getCountAgg = () => ({
  dns_count: {
    cardinality: {
      field: 'dns.question.etld_plus_one',
    },
  },
});

const createIncludePTRFilter = (isPtrIncluded: boolean) =>
  isPtrIncluded
    ? [
        {
          must_not: [
            {
              match_phrase: {
                ['dns.question.type']: {
                  query: 'PTR',
                },
              },
            },
          ],
        },
      ]
    : [];

export const buildDnsQuery = ({
  fields,
  filterQuery,
  isPtrIncluded,
  networkDnsSortField,
  timerange: { from, to },
  pagination: { limit },
  sourceConfiguration: {
    fields: { timestamp },
    logAlias,
    packetbeatAlias,
  },
}: NetworkDnsRequestOptions) => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    ...createIncludePTRFilter(isPtrIncluded),
    {
      must: [
        {
          match_phrase: {
            'network.protocol': {
              query: 'dns',
            },
          },
        },
      ],
    },
    {
      range: {
        [timestamp]: {
          gte: from,
          lte: to,
        },
      },
    },
  ];

  const dslQuery = {
    allowNoIndices: true,
    index: packetbeatAlias,
    ignoreUnavailable: true,
    body: {
      aggregations: {
        ...getCountAgg(),
        dns_name_query_count: {
          terms: {
            field: 'dns.question.etld_plus_one',
            size: limit + 1,
            order: {
              ...getQueryOrder(networkDnsSortField),
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
            timestamp: {
              max: {
                field: '@timestamp',
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
    },
    size: 0,
    track_total_hits: false,
  };
  return dslQuery;
};
