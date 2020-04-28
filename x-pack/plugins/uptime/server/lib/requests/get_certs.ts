/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMElasticsearchQueryFn } from '../adapters';
import { Cert, GetCertsParams } from '../../../common/runtime_types';

export const getCerts: UMElasticsearchQueryFn<GetCertsParams, Cert[]> = async ({
  callES,
  dynamicSettings,
  index,
  from,
  to,
  search,
  size,
}) => {
  const searchWrapper = `*${search}*`;
  const params: any = {
    index: dynamicSettings.heartbeatIndices,
    body: {
      from: index,
      size,
      query: {
        bool: {
          filter: [
            {
              exists: {
                field: 'tls',
              },
            },
            {
              range: {
                '@timestamp': {
                  gte: from,
                  lte: to,
                },
              },
            },
          ],
        },
      },
      _source: [
        'monitor.id',
        'monitor.name',
        'tls.server.x509.issuer.common_name',
        'tls.server.x509.subject.common_name',
        'tls.server.hash.sha1',
        'tls.server.hash.sha256',
        'tls.certificate_not_valid_before',
        'tls.certificate_not_valid_after',
      ],
      collapse: {
        field: 'tls.server.hash.sha256',
        inner_hits: {
          _source: {
            includes: ['monitor.id', 'monitor.name'],
          },
          collapse: {
            field: 'monitor.id',
          },
          name: 'monitors',
          sort: [{ 'monitor.id': 'asc' }],
        },
      },
    },
  };

  if (search) {
    params.body.query.bool.should = [
      {
        wildcard: {
          'tls.server.issuer': {
            value: searchWrapper,
          },
        },
      },
      {
        wildcard: {
          'tls.common_name': {
            value: searchWrapper,
          },
        },
      },
      {
        wildcard: {
          'monitor.id': {
            value: searchWrapper,
          },
        },
      },
      {
        wildcard: {
          'monitor.name': {
            value: searchWrapper,
          },
        },
      },
    ];
  }

  const result = await callES('search', params);
  const formatted = (result?.hits?.hits ?? []).map((hit: any) => {
    const {
      _source: {
        tls: {
          server: {
            x509: {
              issuer: { common_name: issuer },
              subject: { common_name },
            },
            hash: { sha1, sha256 },
          },
          certificate_not_valid_after,
          certificate_not_valid_before,
        },
      },
    } = hit;
    const monitors = hit.inner_hits.monitors.hits.hits.map((monitor: any) => ({
      name: monitor._source?.monitor.name,
      id: monitor._source?.monitor.id,
    }));
    return {
      monitors,
      certificate_not_valid_after,
      certificate_not_valid_before,
      issuer,
      sha1,
      sha256,
      common_name,
    };
  });
  return formatted;
};
