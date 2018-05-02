/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SERVICE_NAME,
  TRANSACTION_DURATION,
  SERVICE_AGENT_NAME,
  PROCESSOR_EVENT
} from '../../../common/constants';
import { get } from 'lodash';

export async function getServices({ setup }) {
  const { start, end, client, config } = setup;

  const params = {
    index: config.get('xpack.apm.indexPattern'),
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            {
              bool: {
                should: [
                  {
                    term: {
                      [PROCESSOR_EVENT]: 'transaction'
                    }
                  },
                  {
                    term: {
                      [PROCESSOR_EVENT]: 'error'
                    }
                  }
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

  const resp = await client('search', params);

  const buckets = get(resp.aggregations, 'services.buckets', []);
  return buckets.map(bucket => {
    const eventTypes = bucket.events.buckets;

    const transactions = eventTypes.find(e => e.key === 'transaction');
    const totalTransactions = get(transactions, 'doc_count', 0);

    const errors = eventTypes.find(e => e.key === 'error');
    const totalErrors = get(errors, 'doc_count', 0);

    const deltaAsMinutes = (end - start) / 1000 / 60;

    const transactionsPerMinute = totalTransactions / deltaAsMinutes;
    const errorsPerMinute = totalErrors / deltaAsMinutes;

    return {
      service_name: bucket.key,
      agent_name: get(bucket, 'agents.buckets[0].key', null),
      transactions_per_minute: transactionsPerMinute,
      errors_per_minute: errorsPerMinute,
      avg_response_time: bucket.avg.value
    };
  });
}
