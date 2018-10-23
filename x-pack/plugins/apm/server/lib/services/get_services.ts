/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { oc } from 'ts-optchain';
import { TermsAggsBucket } from 'x-pack/plugins/apm/typings/elasticsearch';
import {
  PROCESSOR_EVENT,
  SERVICE_AGENT_NAME,
  SERVICE_NAME,
  TRANSACTION_DURATION
} from '../../../common/constants';
import { Setup } from '../helpers/setup_request';

export interface ServiceListItemResponse {
  service_name: string;
  agent_name: string | undefined;
  transactions_per_minute: number;
  errors_per_minute: number;
  avg_response_time: number;
}

export async function getServices(
  setup: Setup
): Promise<ServiceListItemResponse[]> {
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
            {
              bool: {
                should: [
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
          ]
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

  if (esFilterQuery) {
    params.body.query.bool.filter.push(esFilterQuery);
  }

  interface ServiceBucket extends TermsAggsBucket {
    avg: {
      value: number;
    };
    agents: {
      buckets: TermsAggsBucket[];
    };
    events: {
      buckets: TermsAggsBucket[];
    };
  }

  interface Aggs extends TermsAggsBucket {
    services: {
      buckets: ServiceBucket[];
    };
  }

  const resp = await client('search', params);
  const aggs: Aggs = resp.aggregations;
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
      service_name: bucket.key,
      agent_name: oc(bucket).agents.buckets[0].key(),
      transactions_per_minute: transactionsPerMinute,
      errors_per_minute: errorsPerMinute,
      avg_response_time: bucket.avg.value
    };
  });
}
