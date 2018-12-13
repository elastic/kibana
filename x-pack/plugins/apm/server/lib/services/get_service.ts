/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { oc } from 'ts-optchain';
import { BucketAgg } from 'x-pack/plugins/apm/typings/elasticsearch';
import {
  SERVICE_AGENT_NAME,
  SERVICE_NAME,
  TRANSACTION_TYPE
} from '../../../common/constants';
import { Setup } from '../helpers/setup_request';

export interface ServiceAPIResponse {
  serviceName: string;
  types: string[];
  agentName?: string;
}

export async function getService(
  serviceName: string,
  setup: Setup
): Promise<ServiceAPIResponse> {
  const { start, end, esFilterQuery, client, config } = setup;

  const params = {
    index: [
      config.get<string>('apm_oss.errorIndices'),
      config.get<string>('apm_oss.transactionIndices')
    ],
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
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
      aggs: {
        types: {
          terms: { field: TRANSACTION_TYPE, size: 100 }
        },
        agents: {
          terms: { field: SERVICE_AGENT_NAME, size: 1 }
        }
      }
    }
  };

  if (esFilterQuery) {
    params.body.query.bool.filter.push(esFilterQuery);
  }

  interface Aggs {
    types: {
      buckets: BucketAgg[];
    };
    agents: {
      buckets: BucketAgg[];
    };
  }

  const { aggregations } = await client<void, Aggs>('search', params);
  return {
    serviceName,
    types: oc(aggregations)
      .types.buckets([])
      .map(bucket => bucket.key),
    agentName: oc(aggregations).agents.buckets[0].key()
  };
}
