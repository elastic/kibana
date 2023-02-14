/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useState } from 'react';
import createContainer from 'constate';
import { useSourceContext } from '../../../../containers/metrics_source';
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
  const { buildQuery, getDateRangeAsTimestamp } = useUnifiedSearchContext();
  const [hostViewState, setHostViewState] = useState<HostViewState>(INITAL_VALUE);

  const baseRequest = useMemo(() => {
    const esQuery = buildQuery();
    const { from, to } = getDateRangeAsTimestamp();

    const snapshotRequest: UseSnapshotRequest = {
      filterQuery: esQuery ? JSON.stringify(esQuery) : null,
      metrics: [],
      groupBy: [],
      nodeType: 'host',
      sourceId,
      currentTime: to,
      includeTimeseries: false,
      sendRequestImmediately: true,
      timerange: {
        interval: '1m',
        from,
        to,
        ignoreLookback: true,
      },
      // The user might want to click on the submit button without changing the filters
      // This makes sure all child components will re-render.
      requestTs: Date.now(),
    };
    return snapshotRequest;
  }, [buildQuery, getDateRangeAsTimestamp, sourceId]);

  return {
    baseRequest,
    hostViewState,
    setHostViewState,
  };
};

export const HostsView = createContainer(useHostsView);
export const [HostsViewProvider, useHostsViewContext] = HostsView;
