/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMElasticsearchQueryFn } from '../adapters';
import {
  CertResult,
  GetCertsParams,
} from '../../../../../legacy/plugins/uptime/common/runtime_types';

export const getCerts: UMElasticsearchQueryFn<GetCertsParams, CertResult> = async ({
  callES,
  dynamicSettings,
  index,
  from,
  to,
  search,
  size,
  sortBy,
  direction,
}) => {
  const searchWrapper = `*${search}*`;
  let sort = sortBy;
  if (sort === 'certificate_not_valid_after') {
    sort = 'tls.certificate_not_valid_after';
  }
  const params: any = {
    index: dynamicSettings.heartbeatIndices,
    body: {
      from: index * size,
      size,
      sort: [
        {
          [sort]: {
            order: direction,
          },
        },
      ],
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
      aggs: {
        total: {
          cardinality: {
            field: 'tls.server.hash.sha256',
          },
        },
      },
    },
  };

  if (search) {
    params.body.query.bool.minimum_should_match = 1;
    params.body.query.bool.should = [
      {
        multi_match: {
          query: searchWrapper,
          type: 'phrase_prefix',
          fields: ['monitor.id.text', 'monitor.name.text'],
        },
      },
      {
        wildcard: {
          'tls.server.x509.subject.common_name.text': {
            value: searchWrapper,
          },
        },
      },
      {
        wildcard: {
          'tls.server.x509.issuer.common_name.text': {
            value: searchWrapper,
          },
        },
      },
    ];
  }

  const result = await callES('search', params);

  const certs = (result?.hits?.hits ?? []).map((hit: any) => {
    const {
      _source: {
        tls: { server, certificate_not_valid_after, certificate_not_valid_before },
      },
    } = hit;

    const issuer = server?.x509?.issuer?.common_name;
    const commonName = server?.x509?.subject?.common_name;
    const sha1 = server?.hash?.sha1;
    const sha256 = server?.hash?.sha256;

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
      common_name: commonName,
    };
  });
  const total = result?.aggregations?.total?.value ?? 0;
  return { certs, total };
};
