/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMElasticsearchQueryFn } from '../adapters/framework';
import { GetCertificatesParams } from '../../../../../legacy/plugins/uptime/common/types/certificates';
import { Certificates } from '../../../../../legacy/plugins/uptime/common/runtime_types/certificates';

export const getCertificates: UMElasticsearchQueryFn<GetCertificatesParams, Certificates> = async ({
  callES,
  dynamicSettings,
  query,
  sort,
  size,
  page,
}) => {
  const params: any = {
    index: dynamicSettings.heartbeatIndices,
    body: {
      query: {
        match_all: {},
      },
      size: 0,
      aggs: {
        certificates: {
          terms: {
            field: 'tls.sh256',
            size: 10,
          },
          aggs: {
            list: {
              top_hits: {
                _source: ['tls'],
                size: 1,
              },
            },
          },
        },
      },
    },
  };

  const { aggregations: aggs } = await callES('search', params);

  return (
    aggs?.certificates?.buckets?.map((bucket: any) => ({
      ...(bucket?.list?.hits?.hits?.[0]._source?.tls ?? {}),
    })) ?? []
  );
};
