/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import createContainer from 'constate';
import { useSourceContext } from '../../../../containers/metrics_source';
import type { UseSnapshotRequest } from '../../inventory_view/hooks/use_snaphot';
import { useUnifiedSearchContext } from './use_unified_search';
import type { InfraTimerangeInput } from '../../../../../common/http_api/snapshot_api';

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
  const [hostViewState, setHostViewState] = useState<HostViewState>(INITAL_VALUE);

  const esQuery = buildQuery();
  const timeRange: InfraTimerangeInput = {
    interval: '1m',
    from: dateRangeTimestamp.from,
    to: dateRangeTimestamp.to,
    ignoreLookback: true,
  };
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

  return { baseRequest, fetch$, hostViewState, setHostViewState };
};

export const HostsView = createContainer(useHostsView);
export const [HostsViewProvider, useHostsViewContext] = HostsView;
