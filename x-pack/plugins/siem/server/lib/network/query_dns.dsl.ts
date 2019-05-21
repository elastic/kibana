/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Direction, NetworkDnsFields, NetworkDnsSortField } from '../../graphql/types';
import { assertUnreachable, createQueryFilterClauses } from '../../utils/build_query';

import { NetworkDnsRequestOptions } from './index';

type QueryOrder =
  | { _count: Direction }
  | { _key: Direction }
  | { unique_domains: Direction }
  | { dns_bytes_in: Direction }
  | { dns_bytes_out: Direction };

const getQueryOrder = (networkDnsSortField: NetworkDnsSortField): QueryOrder => {
  switch (networkDnsSortField.field) {
    case NetworkDnsFields.queryCount:
      return { _count: networkDnsSortField.direction };
    case NetworkDnsFields.dnsName:
      return { _key: networkDnsSortField.direction };
    case NetworkDnsFields.uniqueDomains:
      return { unique_domains: networkDnsSortField.direction };
    case NetworkDnsFields.dnsBytesIn:
      return { dns_bytes_in: networkDnsSortField.direction };
    case NetworkDnsFields.dnsBytesOut:
      return { dns_bytes_out: networkDnsSortField.direction };
  }
  assertUnreachable(networkDnsSortField.field);
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
    ? {}
    : {
        must_not: [
          {
            match_phrase: {
              'dns.question.type': {
                query: 'PTR',
              },
            },
          },
        ],
      };

const getDnsFilter = () => ({
  must: [
    {
      match_phrase: {
        'network.protocol': {
          query: 'dns',
        },
      },
    },
  ],
});

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
          ...getDnsFilter(),
          ...createIncludePTRFilter(isPtrIncluded),
        },
      },
    },
    size: 0,
    track_total_hits: false,
  };
  return dslQuery;
};
