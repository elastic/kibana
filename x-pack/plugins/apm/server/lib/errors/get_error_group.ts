/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { oc } from 'ts-optchain';
import { APMError } from 'x-pack/plugins/apm/typings/es_schemas/Error';
import { ERROR_GROUP_ID, SERVICE_NAME } from '../../../common/constants';
import { Setup } from '../helpers/setup_request';

export interface ErrorGroupAPIResponse {
  error?: APMError;
  occurrencesCount?: number;
}

export async function getErrorGroup({
  serviceName,
  groupId,
  setup
}: {
  serviceName: string;
  groupId: string;
  setup: Setup;
}): Promise<ErrorGroupAPIResponse> {
  const { start, end, esFilterQuery, client, config } = setup;

  const params = {
    index: config.get<string>('apm_oss.errorIndices'),
    body: {
      size: 1,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            { term: { [ERROR_GROUP_ID]: groupId } },
            {
              range: {
                '@timestamp': {
                  gte: start,
                  lte: end,
                  format: 'epoch_millis'
                }
              }
            }
          ]
        }
      },
      sort: [
        {
          '@timestamp': 'desc'
        }
      ]
    }
  };

  if (esFilterQuery) {
    params.body.query.bool.filter.push(esFilterQuery);
  }

  const resp = await client<APMError>('search', params);

  return {
    error: oc(resp).hits.hits[0]._source(),
    occurrencesCount: oc(resp).hits.total()
  };
}
