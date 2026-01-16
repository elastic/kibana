/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { termQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { fetchDurationFieldCandidates } from '../../routes/correlations/queries/fetch_duration_field_candidates';
import { fetchFieldValuePairs } from '../../routes/correlations/queries/fetch_field_value_pairs';
import { fetchSignificantCorrelations } from '../../routes/correlations/queries/fetch_significant_correlations';
import { SERVICE_NAME, TRANSACTION_NAME, TRANSACTION_TYPE } from '../../../common/es_fields/apm';
import { fetchPValues } from '../../routes/correlations/queries/fetch_p_values';

export async function getCorrelations({
  apmEventClient,
  start,
  end,
  kqlFilter = '',
  type,
  serviceName,
  transactionName,
  transactionType,
  environment,
}: {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  kqlFilter?: string;
  type: 'latency' | 'failures';
  serviceName: string;
  transactionName: string;
  transactionType: string;
  environment: string;
}) {
  const { fieldCandidates } = await fetchDurationFieldCandidates({
    eventType: ProcessorEvent.transaction,
    start,
    end,
    environment,
    kuery: kqlFilter,
    query: {
      bool: {
        filter: [
          ...termQuery(SERVICE_NAME, serviceName),
          ...termQuery(TRANSACTION_TYPE, transactionType),
          ...termQuery(TRANSACTION_NAME, transactionName),
        ],
      },
    },
    apmEventClient,
  });

  if (type === 'failures') {
    const significantCorrelations = await Promise.all(
      fieldCandidates.map(async (fieldCandidate) => {
        const failedTransactionCorrelations = await await fetchPValues({
          apmEventClient,
          start,
          end,
          environment,
          kuery: kqlFilter,
          query: {
            bool: {
              filter: [
                ...termQuery(SERVICE_NAME, serviceName),
                ...termQuery(TRANSACTION_TYPE, transactionType),
                ...termQuery(TRANSACTION_NAME, transactionName),
              ],
            },
          },
          fieldCandidates: [fieldCandidate],
        });
        return failedTransactionCorrelations;
      })
    );
    return significantCorrelations.filter(
      (correlation) => correlation.failedTransactionsCorrelations.length > 0
    );
  } else {
    const { fieldValuePairs } = await fetchFieldValuePairs({
      apmEventClient,
      eventType: ProcessorEvent.transaction,
      start,
      end,
      environment,
      kuery: kqlFilter,
      query: {
        bool: {
          filter: [
            ...termQuery(SERVICE_NAME, serviceName),
            ...termQuery(TRANSACTION_TYPE, transactionType),
            ...termQuery(TRANSACTION_NAME, transactionName),
          ],
        },
      },
      fieldCandidates,
    });

    const significantCorrelations = await Promise.all(
      fieldValuePairs.map(async (fieldValuePair) => {
        const latencyCorrelations = await fetchSignificantCorrelations({
          apmEventClient,
          start,
          end,
          environment,
          kuery: kqlFilter,
          query: {
            bool: {
              filter: [
                ...termQuery(SERVICE_NAME, serviceName),
                ...termQuery(TRANSACTION_TYPE, transactionType),
                ...termQuery(TRANSACTION_NAME, transactionName),
              ],
            },
          },
          fieldValuePairs: [fieldValuePair],
        });

        return latencyCorrelations;
      })
    );

    return significantCorrelations.filter((correlation) => !!correlation.fallbackResult);
  }
}
