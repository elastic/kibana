/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import DateMath from '@kbn/datemath';
import { EXCLUDE_RUN_ONCE_FILTER, FINAL_SUMMARY_FILTER } from '../constants/client_defaults';
import type { CertificatesResults } from '../../server/queries/get_certs';
import { CertResult, GetCertsParams, Ping } from '../runtime_types';
import { createEsQuery } from '../utils/es_search';

import { asMutableArray } from '../utils/as_mutable_array';

enum SortFields {
  'issuer' = 'tls.server.x509.issuer.common_name',
  'not_after' = 'tls.server.x509.not_after',
  'not_before' = 'tls.server.x509.not_before',
  'common_name' = 'tls.server.x509.subject.common_name',
}

export const DEFAULT_SORT = 'not_after';
export const DEFAULT_DIRECTION = 'asc';
export const DEFAULT_SIZE = 20;
export const DEFAULT_FROM = 'now-20m';
export const DEFAULT_TO = 'now';

function absoluteDate(relativeDate: string) {
  return DateMath.parse(relativeDate)?.valueOf() ?? relativeDate;
}

export const getCertsRequestBody = ({
  monitorIds,
  pageIndex,
  search,
  notValidBefore,
  notValidAfter,
  size = DEFAULT_SIZE,
  to = DEFAULT_TO,
  from = DEFAULT_FROM,
  sortBy = DEFAULT_SORT,
  direction = DEFAULT_DIRECTION,
  filters,
}: GetCertsParams) => {
  const sort = SortFields[sortBy as keyof typeof SortFields];

  const searchRequest = createEsQuery({
    body: {
      from: (pageIndex ?? 0) * size,
      size,
      sort: asMutableArray([
        {
          [sort]: {
            order: direction,
          },
        },
      ]) as estypes.SortCombinations[],
      query: {
        bool: {
          ...(search
            ? {
                minimum_should_match: 1,
                should: [
                  {
                    multi_match: {
                      query: escape(search),
                      type: 'phrase_prefix' as const,
                      fields: [
                        'monitor.id.text',
                        'monitor.name.text',
                        'url.full.text',
                        'tls.server.x509.subject.common_name.text',
                        'tls.server.x509.issuer.common_name.text',
                      ],
                    },
                  },
                ],
              }
            : {}),
          filter: [
            FINAL_SUMMARY_FILTER,
            EXCLUDE_RUN_ONCE_FILTER,
            ...(filters ? [filters] : []),
            ...(monitorIds && monitorIds.length > 0
              ? [{ terms: { 'monitor.id': monitorIds } }]
              : []),
            {
              exists: {
                field: 'tls.server.hash.sha256',
              },
            },
            {
              range: {
                'monitor.timespan': {
                  gte: absoluteDate(from),
                  lte: absoluteDate(to),
                },
              },
            },
            {
              bool: {
                // these notValidBefore and notValidAfter should be inside should block, since
                // we want to match either of the condition, making ir an OR operation
                minimum_should_match: 1,
                should: [
                  ...(notValidBefore
                    ? [
                        {
                          range: {
                            'tls.certificate_not_valid_before': {
                              lte: absoluteDate(notValidBefore),
                            },
                          },
                        },
                      ]
                    : []),
                  ...(notValidAfter
                    ? [
                        {
                          range: {
                            'tls.certificate_not_valid_after': {
                              lte: absoluteDate(notValidAfter),
                            },
                          },
                        },
                      ]
                    : []),
                ],
              },
            },
          ] as estypes.QueryDslQueryContainer,
        },
      },
      _source: [
        '@timestamp',
        'config_id',
        'monitor.id',
        'monitor.name',
        'monitor.type',
        'url.full',
        'observer.geo.name',
        'tls.server.x509.issuer.common_name',
        'tls.server.x509.subject.common_name',
        'tls.server.hash.sha1',
        'tls.server.hash.sha256',
        'tls.server.x509.not_after',
        'tls.server.x509.not_before',
      ],
      collapse: {
        field: 'tls.server.hash.sha256',
        inner_hits: {
          _source: {
            includes: ['monitor.id', 'monitor.name', 'url.full', 'config_id'],
          },
          collapse: {
            field: 'monitor.id',
          },
          name: 'monitors',
          sort: [{ 'monitor.id': 'asc' as const }],
        },
      },
      aggs: {
        total: {
          cardinality: {
            field: 'tls.server.hash.sha256',
          },
        },
      },
    },
  });

  return searchRequest.body;
};

export const processCertsResult = (result: CertificatesResults): CertResult => {
  const certs = result.hits?.hits?.map((hit) => {
    const ping = hit._source;
    const server = ping.tls?.server!;

    const notAfter = server?.x509?.not_after;
    const notBefore = server?.x509?.not_before;
    const issuer = server?.x509?.issuer?.common_name;
    const commonName = server?.x509?.subject?.common_name;
    const sha1 = server?.hash?.sha1;
    const sha256 = server?.hash?.sha256;

    const monitors = hit.inner_hits!.monitors.hits.hits.map((monitor) => {
      const monitorPing = monitor._source as Ping;

      return {
        name: monitorPing?.monitor.name,
        id: monitorPing?.monitor.id,
        configId: monitorPing?.config_id,
        url: monitorPing?.url?.full,
      };
    });

    return {
      monitors,
      issuer,
      sha1,
      sha256: sha256 as string,
      not_after: notAfter,
      not_before: notBefore,
      common_name: commonName,
      monitorName: ping?.monitor?.name,
      configId: ping.config_id!,
      monitorUrl: ping?.url?.full,
      '@timestamp': ping['@timestamp'],
      monitorType: ping?.monitor?.type,
      locationName: ping?.observer?.geo?.name,
    };
  });
  const total = result.aggregations?.total?.value ?? 0;
  return { certs, total };
};
