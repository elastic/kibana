/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { termQuery } from '@kbn/observability-plugin/server';
import { ApmDocumentType } from '../../../../common/document_type';
import { TRANSACTION_TYPE } from '../../../../common/es_fields/apm';
import { RollupInterval } from '../../../../common/rollup';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { getOutcomeAggregation } from '../../../lib/helpers/transaction_error_rate';
import { fetchSeries } from './fetch_timeseries';

export async function getTransactionFailureRate({
  apmEventClient,
  start,
  end,
  intervalString,
  filter,
  transactionType,
}: {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  intervalString: string;
  bucketSize: number;
  filter: QueryDslQueryContainer[];
  transactionType?: string;
}) {
  return (
    await fetchSeries({
      apmEventClient,
      start,
      end,
      operationName: 'assistant_get_transaction_failure_rate',
      unit: '%',
      documentType: ApmDocumentType.TransactionMetric,
      rollupInterval: RollupInterval.OneMinute,
      intervalString,
      filter: filter.concat(...termQuery(TRANSACTION_TYPE, transactionType)),
      groupBy: 'transaction.type',
      aggs: {
        ...getOutcomeAggregation(ApmDocumentType.TransactionMetric),
        value: {
          bucket_script: {
            buckets_path: {
              successful_or_failed: 'successful_or_failed>_count',
              successful: 'successful>_count',
            },
            script:
              '100 * (1 - (params.successful / params.successful_or_failed))',
          },
        },
      },
    })
  ).map((fetchedSerie) => {
    return {
      ...fetchedSerie,
      data: fetchedSerie.data.map((bucket) => {
        return {
          x: bucket.key,
          y: bucket.value?.value as number | null,
        };
      }),
    };
  });
}
