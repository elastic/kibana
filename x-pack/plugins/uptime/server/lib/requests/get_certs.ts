/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { UMElasticsearchQueryFn } from '../adapters';
import {
  Cert,
  CertElasticsearchResponse,
} from '../../../../../legacy/plugins/uptime/common/runtime_types';

export interface GetCertsParams {
  from: number;
  size: number;
}

export const getCerts: UMElasticsearchQueryFn<GetCertsParams, Cert[]> = async ({
  callES,
  dynamicSettings,
  from,
  size,
}) => {
  const params = {
    index: dynamicSettings.heartbeatIndices,
    body: {
      from,
      size,
      query: {
        bool: {
          filter: [
            {
              exists: {
                field: 'tls',
              },
            },
          ],
        },
      },
      _source: [
        'tls.common_name',
        'tls.sh256',
        'tls.issued_by',
        'tls.certificate_not_valid_before',
        'tls.certificate_not_valid_after',
      ],
      collapse: {
        field: 'tls.common_name',
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
  const result = await callES('search', params);
  const decodedResult = CertElasticsearchResponse.decode(result);
  if (isRight(decodedResult)) {
    const formatted = decodedResult.right.hits.hits.map(hit => {
      const {
        _source: {
          tls: {
            certificate_not_valid_after,
            certificate_not_valid_before,
            issued_by,
            sha256,
            common_name,
          },
        },
      } = hit;
      const monitors = hit.inner_hits.monitors.hits.hits.map(monitor => ({
        name: monitor._source?.monitor.name,
        id: monitor._source?.monitor.id,
      }));
      return {
        monitors,
        certificate_not_valid_after,
        certificate_not_valid_before,
        issued_by,
        sha256,
        common_name,
      };
    });
    return formatted;
  }
  throw new Error(PathReporter.report(decodedResult).join(';'));
};
