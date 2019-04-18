/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BucketAgg, ESFilter } from 'elasticsearch';
import {
  PROCESSOR_EVENT,
  SERVICE_AGENT_NAME,
  SERVICE_NAME,
  TRANSACTION_DURATION
} from '../../../../common/elasticsearch_fieldnames';
import { idx } from '../../../../common/idx';
import { PromiseReturnType } from '../../../../typings/common';
import { rangeFilter } from '../../helpers/range_filter';
import { Setup } from '../../helpers/setup_request';

export type ServiceListAPIResponse = PromiseReturnType<typeof getServicesItems>;
export async function getServicesItems(setup: Setup) {
  const { start, end, esFilterQuery, client, config } = setup;

  const filter: ESFilter[] = [
    { terms: { [PROCESSOR_EVENT]: ['transaction', 'error', 'metric'] } },
    { range: rangeFilter(start, end) }
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
  const serviceBuckets = idx(aggs, _ => _.services.buckets) || [];

  const items = serviceBuckets.map(bucket => {
    const eventTypes = bucket.events.buckets;
    const transactions = eventTypes.find(e => e.key === 'transaction');
    const totalTransactions = idx(transactions, _ => _.doc_count) || 0;

    const errors = eventTypes.find(e => e.key === 'error');
    const totalErrors = idx(errors, _ => _.doc_count) || 0;

    const deltaAsMinutes = (end - start) / 1000 / 60;
    const transactionsPerMinute = totalTransactions / deltaAsMinutes;
    const errorsPerMinute = totalErrors / deltaAsMinutes;

    return {
      serviceName: bucket.key,
      agentName: idx(bucket, _ => _.agents.buckets[0].key),
      transactionsPerMinute,
      errorsPerMinute,
      avgResponseTime: bucket.avg.value
    };
  });

  return items;
}
