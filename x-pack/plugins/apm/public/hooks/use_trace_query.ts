/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useEffect, useState } from 'react';
import { TraceSearchQuery } from '../../common/trace_explorer';
import { TraceSearchState } from '../../common/trace_explorer/trace_data_search_state';
import { callApmApi } from '../services/rest/createCallApmApi';
import { useApmParams } from './use_apm_params';
import { useTimeRange } from './use_time_range';

export interface UseTraceQueryState {
  query: TraceSearchQuery;
  setQuery: (query: TraceSearchQuery) => void;
  commit: () => void;
  traceSearchState?: TraceSearchState;
  traceSearchStateLoading?: boolean;
}

export function useTraceQuery(defaults: TraceSearchQuery): UseTraceQueryState {
  const [query, setQuery] = useState(defaults);

  const [committedQuery, setCommittedQuery] = useState(query);

  const [traceSearchState, setTraceSearchState] = useState<
    TraceSearchState | undefined
  >(undefined);

  const [traceSearchStateLoading, setTraceSearchStateLoading] = useState(false);

  const {
    query: { rangeFrom, rangeTo, environment },
  } = useApmParams('/trace-explorer');

  const { start, end } = useTimeRange({
    rangeFrom,
    rangeTo,
  });

  const fetchData = useCallback(() => {
    if (!committedQuery.query || !committedQuery.type) {
      setTraceSearchStateLoading(false);
      return;
    }
    setTraceSearchStateLoading(true);
    return callApmApi({
      endpoint: 'GET /internal/apm/trace_explorer/trace_data',
      params: {
        query: {
          start,
          end,
          environment,
          type: committedQuery.type,
          query: committedQuery.query,
        },
      },
      signal: null,
      isCachable: false,
    })
      .then((state) => {
        setTraceSearchState(state.traceData);

        if (state.traceData.isRunning) {
          fetchData();
        }
      })
      .catch((err) => {})
      .finally(() => {
        setTraceSearchStateLoading(false);
      });
  }, [start, end, environment, committedQuery.type, committedQuery.query]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    query,
    setQuery,
    commit: () => {
      setCommittedQuery(query);
    },
    traceSearchState,
    traceSearchStateLoading,
  };
}
