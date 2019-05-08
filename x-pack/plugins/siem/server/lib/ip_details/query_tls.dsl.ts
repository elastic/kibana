/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createQueryFilterClauses, assertUnreachable } from '../../utils/build_query';

import { TlsRequestOptions } from './index';
import { TlsSortField, Direction, TlsFields } from '../../graphql/types';

const getAggs = (limit: number, tlsSortField: TlsSortField) => ({
  count: {
    cardinality: {
      field: 'tls.server_certificate.fingerprint.sha1',
    },
  },
  sha1: {
    terms: {
      field: 'tls.server_certificate.fingerprint.sha1',
      size: limit + 1,
      order: {
        ...getQueryOrder(tlsSortField),
      },
    },
    aggs: {
      issuer_names: {
        terms: {
          field: 'tls.server_certificate.issuer.common_name',
        },
      },
      common_names: {
        terms: {
          field: 'tls.server_certificate.subject.common_name',
        },
      },
      alternative_names: {
        terms: {
          field: 'tls.server_certificate.alternative_names',
        },
      },
      not_after: {
        terms: {
          field: 'tls.server_certificate.not_after',
        },
      },
      ja3: {
        terms: {
          field: 'tls.fingerprints.ja3.hash',
        },
      },
    },
  },
});

export const buildTlsQuery = ({
  ip,
  tlsSortField,
  filterQuery,
  flowTarget,
  pagination: { limit },
  sourceConfiguration: {
    fields: { timestamp },
    auditbeatAlias,
    logAlias,
    packetbeatAlias,
    winlogbeatAlias,
  },
  timerange: { from, to },
}: TlsRequestOptions) => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    { range: { [timestamp]: { gte: from, lte: to } } },
    { term: { [`${flowTarget}.ip`]: ip } },
    { term: { 'event.dataset': 'tls' } },
  ];

  const dslQuery = {
    allowNoIndices: true,
    index: [logAlias, auditbeatAlias, packetbeatAlias, winlogbeatAlias],
    ignoreUnavailable: true,
    body: {
      aggs: {
        ...getAggs(limit, tlsSortField),
      },
      query: {
        bool: {
          filter,
        },
      },
      size: 0,
      track_total_hits: true,
    },
  };

  return dslQuery;
};

interface QueryOrder {
  _key: Direction;
}

const getQueryOrder = (tlsSortField: TlsSortField): QueryOrder => {
  switch (tlsSortField.field) {
    case TlsFields._id:
      return { _key: tlsSortField.direction };
    default:
      return assertUnreachable(tlsSortField.field);
  }
};
