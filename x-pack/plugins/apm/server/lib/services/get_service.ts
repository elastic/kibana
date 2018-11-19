/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { oc } from 'ts-optchain';
import { TermsAggsBucket } from 'x-pack/plugins/apm/typings/elasticsearch';
import {
  SERVICE_AGENT_NAME,
  SERVICE_NAME,
  TRANSACTION_TYPE
} from '../../../common/constants';
import { Setup } from '../helpers/setup_request';

export interface ServiceResponse {
  service_name: string;
  types: string[];
  agent_name?: string;
}

export async function getService(
  serviceName: string,
  setup: Setup
): Promise<ServiceResponse> {
  const { start, end, esFilterQuery, client, config } = setup;

  const params = {
    index: [
      config.get('apm_oss.errorIndices'),
      config.get('apm_oss.transactionIndices')
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
      buckets: TermsAggsBucket[];
    };
    agents: {
      buckets: TermsAggsBucket[];
    };
  }

  const resp = await client('search', params);
  const aggs: Aggs = resp.aggregations;

  return {
    service_name: serviceName,
    types: aggs.types.buckets.map(bucket => bucket.key),
    agent_name: oc(aggs).agents.buckets[0].key()
  };
}
