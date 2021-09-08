/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useFallbackToTransactionsFetcher } from '../../../hooks/use_fallback_to_transactions_fetcher';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import type { APIReturnType } from '../../../services/rest/createCallApmApi';
import { AggregatedTransactionsBadge } from '../../shared/aggregated_transactions_badge';
import { SearchBar } from '../../shared/search_bar';
import { TraceList } from './trace_list';

type TracesAPIResponse = APIReturnType<'GET /api/apm/traces'>;
const DEFAULT_RESPONSE: TracesAPIResponse = {
  items: [],
};

export function TraceOverview() {
  const {
    query: { environment, kuery, rangeFrom, rangeTo },
  } = useApmParams('/traces');
  const { fallbackToTransactions } = useFallbackToTransactionsFetcher({
    kuery,
  });

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { status, data = DEFAULT_RESPONSE } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi({
          endpoint: 'GET /api/apm/traces',
          params: {
            query: {
              environment,
              kuery,
              start,
              end,
            },
          },
        });
      }
    },
    [environment, kuery, start, end]
  );

  return (
    <>
      <SearchBar />

      {fallbackToTransactions && (
        <EuiFlexGroup>
          <EuiFlexItem>
            <AggregatedTransactionsBadge />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}

      <TraceList
        items={data.items}
        isLoading={status === FETCH_STATUS.LOADING}
      />
    </>
  );
}
