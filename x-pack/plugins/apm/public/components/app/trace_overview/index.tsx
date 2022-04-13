/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { useApmParams } from '../../../hooks/use_apm_params';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { APIReturnType } from '../../../services/rest/create_call_apm_api';
import { SearchBar } from '../../shared/search_bar';
import { TraceList } from './trace_list';
import { useFallbackToTransactionsFetcher } from '../../../hooks/use_fallback_to_transactions_fetcher';
import { AggregatedTransactionsBadge } from '../../shared/aggregated_transactions_badge';
import { useTimeRange } from '../../../hooks/use_time_range';

type TracesAPIResponse = APIReturnType<'GET /internal/apm/traces'>;
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
        return callApmApi('GET /internal/apm/traces', {
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
        isFailure={status === FETCH_STATUS.FAILURE}
      />
    </>
  );
}
