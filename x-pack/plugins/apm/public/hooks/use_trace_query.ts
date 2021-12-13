/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { useEffect, useRef, useState } from 'react';
import { TraceSearchQuery } from '../../common/trace_explorer';
import { TraceSearchState } from '../../common/trace_explorer/trace_data_search_state';
import { useApmPluginContext } from '../context/apm_plugin/use_apm_plugin_context';
import { callApmApi } from '../services/rest/createCallApmApi';
import { useApmParams } from './use_apm_params';
import { useTimeRange } from './use_time_range';

export interface UseTraceQueryState {
  query: TraceSearchQuery;
  setQuery: (query: TraceSearchQuery) => void;
  commit: () => void;
  cancel: () => void;
  traceSearchState?: TraceSearchState;
  traceSearchStateLoading?: boolean;
}

export function useTraceQuery(defaults: TraceSearchQuery): UseTraceQueryState {
  const [query, setQuery] = useState(defaults);

  const { core } = useApmPluginContext();

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

  const abortControllerRef = useRef<AbortController>();

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();

    abortControllerRef.current = controller;

    function fetchData() {
      if (controller.signal.aborted) {
        return;
      }
      if (!committedQuery.query || !committedQuery.type) {
        setTraceSearchStateLoading(false);
        return;
      }
      setTraceSearchStateLoading(true);
      callApmApi({
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
        signal: controller.signal,
        isCachable: false,
      })
        .then((state) => {
          setTraceSearchState(state.traceData);

          if (state.traceData.isRunning) {
            fetchData();
          } else {
            setTraceSearchStateLoading(false);
          }
        })
        .catch((err) => {
          if (!controller.signal.aborted) {
            core.notifications.toasts.addError(err, {
              title: i18n.translate(
                'xpack.apm.useTraceQuery.failedTraceSearchFetch',
                { defaultMessage: 'Error fetching traces' }
              ),
            });
          }
          setTraceSearchStateLoading(false);
        });
    }

    fetchData();
  }, [start, end, environment, committedQuery, core]);

  return {
    query,
    setQuery,
    commit: () => {
      setCommittedQuery({ ...query });
    },
    cancel: () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        setTraceSearchState(undefined);
        setTraceSearchStateLoading(false);
      }
    },
    traceSearchState,
    traceSearchStateLoading,
  };
}
