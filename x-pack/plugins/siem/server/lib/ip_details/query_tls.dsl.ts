/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createQueryFilterClauses, assertUnreachable } from '../../utils/build_query';

import { TlsRequestOptions } from './index';
import { TlsSortField, Direction, TlsFields } from '../../graphql/types';

const getAggs = (limit: number, tlsSortField: TlsSortField) => {
  console.log('[server] tlsSortField is:', tlsSortField);
  console.log('[server] getQueryOrder is:', getQueryOrder(tlsSortField));
  const obj = {
    count: {
      cardinality: {
        field: 'tls.server_certificate.fingerprint.sha1',
      },
    },
    sha1: {
      terms: {
        field: 'tls.server_certificate.fingerprint.sha1',
        size: limit + 1,
        // order: { issuer_names: 'desc' },
      },
      aggs: {
        issuer_names: {
          terms: {
            field: 'tls.server_certificate.issuer.common_name',
          },
          aggs: {
            common_name: {
              max: { field: 'key' },
            },
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
  };
  console.log('[server] The whole query is:', JSON.stringify(obj, null, 2));
  return obj;
};

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

type QueryOrder =
  | { _key: Direction }
  | { issuer_names: Direction }
  | { alternative_names: Direction }
  | { common_names: Direction }
  | { not_after: Direction }
  | { ja3: Direction };

const getQueryOrder = (tlsSortField: TlsSortField): QueryOrder => {
  switch (tlsSortField.field) {
    case TlsFields.sha1:
      return { _key: tlsSortField.direction };
    case TlsFields.issuer:
      return { issuer_names: tlsSortField.direction };
    case TlsFields.subject:
      return { alternative_names: tlsSortField.direction }; // TODO: Fix this with common_names secondary sort
    case TlsFields.ja3:
      return { ja3: tlsSortField.direction };
    case TlsFields.validUntil:
      return { not_after: tlsSortField.direction };
    default:
      return assertUnreachable(tlsSortField.field);
  }
};
