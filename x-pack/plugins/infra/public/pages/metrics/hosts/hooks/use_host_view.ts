/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef } from 'react';
import createContainer from 'constate';
import { BehaviorSubject } from 'rxjs';
import { useSourceContext } from '../../../../containers/metrics_source';
import type { SnapshotTimerangeInput } from '../../../../../common/http_api';
import type { UseSnapshotRequest } from '../../inventory_view/hooks/use_snaphot';
import { useUnifiedSearchContext } from './use_unified_search';

export interface HostViewState {
  totalHits: number;
  loading: boolean;
  error: string | null;
}

export const INITAL_VALUE = {
  error: null,
  loading: true,
  totalHits: 0,
};

export const useHostsView = () => {
  const { sourceId } = useSourceContext();
  const { buildQuery, dateRangeTimestamp, fetch$ } = useUnifiedSearchContext();
  const stateRef = useRef<BehaviorSubject<HostViewState> | null>(null);

  const getStateSubject$ = useCallback(() => {
    if (!stateRef.current) {
      stateRef.current = new BehaviorSubject<HostViewState>(INITAL_VALUE);
    }
    return stateRef.current;
  }, []);

  const timeRange: SnapshotTimerangeInput = {
    from: dateRangeTimestamp.from,
    to: dateRangeTimestamp.to,
    lookbackSize: 'maxFixed',
  };

  const esQuery = buildQuery();

  const baseRequest: UseSnapshotRequest = {
    filterQuery: esQuery ? JSON.stringify(esQuery) : null,
    metrics: [],
    groupBy: [],
    nodeType: 'host',
    sourceId,
    currentTime: dateRangeTimestamp.to,
    timerange: timeRange,
    includeTimeseries: false,
    sendRequestImmediately: false,
  };

  useEffect(() => {
    fetch$.next('load');
  }, [fetch$]);

  return { baseRequest, fetch$, state$: getStateSubject$() };
};

export const HostsView = createContainer(useHostsView);
export const [HostsViewProvider, useHostsViewContext] = HostsView;
