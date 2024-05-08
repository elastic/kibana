/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { ApmDocumentType } from '../../../../common/document_type';
import { SERVICE_NAME } from '../../../../common/es_fields/apm';
import { calculateThroughputWithRange } from '../../../lib/helpers/calculate_throughput';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { getDurationFieldForTransactions } from '../../../lib/helpers/transactions';
import {
  calculateFailedTransactionRate,
  getOutcomeAggregation,
} from '../../../lib/helpers/transaction_error_rate';
import { MAX_NUMBER_OF_SERVICES } from './get_service_assets';

export async function getServicesTransactionStats({
  apmEventClient,
  start,
  end,
  kuery,
  serviceNames,
}: {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  kuery: string;
  serviceNames: string[];
}) {
  const response = await apmEventClient.search('get_service_transaction_stats', {
    apm: {
      events: [ProcessorEvent.span, ProcessorEvent.transaction],
    },
    body: {
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [
            ...rangeQuery(start, end),
            ...kqlQuery(kuery),
            { terms: { [SERVICE_NAME]: serviceNames } },
          ],
        },
      },
      aggs: {
        services: {
          terms: {
            field: SERVICE_NAME,
            size: MAX_NUMBER_OF_SERVICES,
          },
          aggs: {
            avg_duration: {
              avg: {
                field: getDurationFieldForTransactions(ApmDocumentType.TransactionEvent, false),
              },
            },
            ...getOutcomeAggregation(ApmDocumentType.TransactionEvent),
          },
        },
      },
    },
  });

  return response.aggregations?.services.buckets.map((bucket) => {
    const serviceName = bucket.key as string;
    return {
      serviceName,
      latency: bucket.avg_duration.value,
      throughput: calculateThroughputWithRange({ start, end, value: bucket.doc_count }),
      transactionErrorRate: calculateFailedTransactionRate(bucket),
    };
  });
}
