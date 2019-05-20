/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BucketAgg, ESFilter } from 'elasticsearch';
import { idx } from '@kbn/elastic-idx';
import {
  PROCESSOR_EVENT,
  SERVICE_AGENT_NAME,
  SERVICE_NAME,
  TRANSACTION_TYPE
} from '../../../common/elasticsearch_fieldnames';
import { PromiseReturnType } from '../../../typings/common';
import { rangeFilter } from '../helpers/range_filter';
import { Setup } from '../helpers/setup_request';

export type ServiceAPIResponse = PromiseReturnType<typeof getService>;
export async function getService(serviceName: string, setup: Setup) {
  const { start, end, esFilterQuery, client, config } = setup;

  const filter: ESFilter[] = [
    { term: { [SERVICE_NAME]: serviceName } },
    { terms: { [PROCESSOR_EVENT]: ['error', 'transaction'] } },
    { range: rangeFilter(start, end) }
  ];

  if (esFilterQuery) {
    filter.push(esFilterQuery);
  }

  const params = {
    index: [
      config.get<string>('apm_oss.errorIndices'),
      config.get<string>('apm_oss.transactionIndices')
    ],
    body: {
      size: 0,
      query: {
        bool: {
          filter
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

  interface Aggs {
    types: {
      buckets: BucketAgg[];
    };
    agents: {
      buckets: BucketAgg[];
    };
  }

  const { aggregations } = await client<void, Aggs>('search', params);
  const buckets = idx(aggregations, _ => _.types.buckets) || [];
  const types = buckets.map(bucket => bucket.key);
  const agentName = idx(aggregations, _ => _.agents.buckets[0].key) || '';
  return {
    serviceName,
    types,
    agentName
  };
}
