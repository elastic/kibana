/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BucketAgg } from 'elasticsearch';
import { ESFilter } from 'elasticsearch';
import { oc } from 'ts-optchain';
import {
  PROCESSOR_EVENT,
  SERVICE_AGENT_NAME,
  SERVICE_NAME,
  TRANSACTION_DURATION
} from '../../../common/constants';
import { Setup } from '../helpers/setup_request';

export interface IServiceListItem {
  serviceName: string;
  agentName: string | undefined;
  transactionsPerMinute: number;
  errorsPerMinute: number;
  avgResponseTime: number;
}

export type ServiceListAPIResponse = IServiceListItem[];

export async function getServices(
  setup: Setup
): Promise<ServiceListAPIResponse> {
  const { start, end, esFilterQuery, client, config } = setup;

  const filter: ESFilter[] = [
    {
      bool: {
        should: [
          { term: { [PROCESSOR_EVENT]: 'metric' } },
          { term: { [PROCESSOR_EVENT]: 'transaction' } },
          { term: { [PROCESSOR_EVENT]: 'error' } }
        ]
      }
    },
    {
      range: {
        '@timestamp': {
          gte: start,
          lte: end,
          format: 'epoch_millis'
        }
      }
    }
  ];

  if (esFilterQuery) {
    filter.push(esFilterQuery);
  }

  const params = {
    index: [
      config.get<string>('apm_oss.metricsIndices'),
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
        services: {
          terms: {
            field: SERVICE_NAME,
            size: 500
          },
          aggs: {
            avg: {
              avg: { field: TRANSACTION_DURATION }
            },
            agents: {
              terms: { field: SERVICE_AGENT_NAME, size: 1 }
            },
            events: {
              terms: { field: PROCESSOR_EVENT, size: 2 }
            }
          }
        }
      }
    }
  };

  interface ServiceBucket extends BucketAgg {
    avg: {
      value: number;
    };
    agents: {
      buckets: BucketAgg[];
    };
    events: {
      buckets: BucketAgg[];
    };
  }

  interface Aggs extends BucketAgg {
    services: {
      buckets: ServiceBucket[];
    };
  }

  const resp = await client<void, Aggs>('search', params);
  const aggs = resp.aggregations;
  const serviceBuckets = oc(aggs).services.buckets([]);

  return serviceBuckets.map(bucket => {
    const eventTypes = bucket.events.buckets;
    const transactions = eventTypes.find(e => e.key === 'transaction');
    const totalTransactions = oc(transactions).doc_count(0);

    const errors = eventTypes.find(e => e.key === 'error');
    const totalErrors = oc(errors).doc_count(0);

    const deltaAsMinutes = (end - start) / 1000 / 60;
    const transactionsPerMinute = totalTransactions / deltaAsMinutes;
    const errorsPerMinute = totalErrors / deltaAsMinutes;

    return {
      serviceName: bucket.key,
      agentName: oc(bucket).agents.buckets[0].key(),
      transactionsPerMinute,
      errorsPerMinute,
      avgResponseTime: bucket.avg.value
    };
  });
}
