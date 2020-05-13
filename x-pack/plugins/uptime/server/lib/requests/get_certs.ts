/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMElasticsearchQueryFn } from '../adapters';
import { CertResult, GetCertsParams } from '../../../common/runtime_types';

enum SortFields {
  'issuer' = 'tls.server.x509.issuer.common_name',
  'not_after' = 'tls.server.x509.not_after',
  'not_before' = 'tls.server.x509.not_before',
  'common_name' = 'tls.server.x509.subject.common_name',
}

export const getCerts: UMElasticsearchQueryFn<GetCertsParams, CertResult> = async ({
  callES,
  dynamicSettings,
  index,
  from,
  to,
  size,
  search,
  notValidBefore,
  notValidAfter,
  sortBy,
  direction,
}) => {
  const sort = SortFields[sortBy as keyof typeof SortFields];

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
                field: 'tls.server',
              },
            },
            {
              range: {
                'monitor.timespan': {
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
        'tls.server.x509.not_after',
        'tls.server.x509.not_before',
      ],
      collapse: {
        field: 'tls.server.hash.sha256',
        inner_hits: {
          _source: {
            includes: ['monitor.id', 'monitor.name', 'url.full'],
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

  if (!params.body.query.bool.should) {
    params.body.query.bool.should = [];
  }

  if (search) {
    params.body.query.bool.minimum_should_match = 1;
    params.body.query.bool.should = [
      {
        multi_match: {
          query: escape(search),
          type: 'phrase_prefix',
          fields: [
            'monitor.id.text',
            'monitor.name.text',
            'url.full.text',
            'tls.server.x509.subject.common_name.text',
            'tls.server.x509.issuer.common_name.text',
          ],
        },
      },
    ];
  }

  if (notValidBefore || notValidAfter) {
    const validityFilters: any = {
      bool: {
        should: [],
      },
    };
    if (notValidBefore) {
      validityFilters.bool.should.push({
        range: {
          'tls.certificate_not_valid_before': {
            lte: notValidBefore,
          },
        },
      });
    }
    if (notValidAfter) {
      validityFilters.bool.should.push({
        range: {
          'tls.certificate_not_valid_after': {
            lte: notValidAfter,
          },
        },
      });
    }

    params.body.query.bool.filter.push(validityFilters);
  }

  // console.log(JSON.stringify(params, null, 2));
  const result = await callES('search', params);

  const certs = (result?.hits?.hits ?? []).map((hit: any) => {
    const {
      _source: {
        tls: { server },
      },
    } = hit;

    const notAfter = server?.x509?.not_after;
    const notBefore = server?.x509?.not_before;
    const issuer = server?.x509?.issuer?.common_name;
    const commonName = server?.x509?.subject?.common_name;
    const sha1 = server?.hash?.sha1;
    const sha256 = server?.hash?.sha256;

    const monitors = hit.inner_hits.monitors.hits.hits.map((monitor: any) => ({
      name: monitor._source?.monitor.name,
      id: monitor._source?.monitor.id,
      url: monitor._source?.url?.full,
    }));

    return {
      monitors,
      issuer,
      sha1,
      sha256,
      not_after: notAfter,
      not_before: notBefore,
      common_name: commonName,
    };
  });
  const total = result?.aggregations?.total?.value ?? 0;
  return { certs, total };
};
