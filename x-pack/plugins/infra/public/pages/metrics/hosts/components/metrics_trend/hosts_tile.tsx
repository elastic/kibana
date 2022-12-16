/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';

import { EuiLoadingSpinner } from '@elastic/eui';
import { useSnapshot } from '../../../inventory_view/hooks/use_snaphot';
import { HostViewState, useHostsViewContext } from '../../hooks/use_host_table';
import { type ChartBaseProps, MetricsChart } from './metrics_chart';

export const MetricsHostsTile = ({ type, ...props }: ChartBaseProps) => {
  const { baseRequest, state$, refetch$ } = useHostsViewContext();
  const [hostView, setHostView] = useState<HostViewState>(state$.getValue());

  const { nodes, loading, reload } = useSnapshot({
    ...baseRequest,
    filterQuery: null,
    metrics: [{ type }],
    groupBy: null,
    includeTimeseries: false,
  });

  useEffect(() => {
    const subscribe = refetch$.subscribe(() => reload());
    return () => {
      subscribe.unsubscribe();
    };
  }, [refetch$, reload]);

  useEffect(() => {
    const subscribe = state$.subscribe(setHostView);
    return () => {
      subscribe.unsubscribe();
    };
  }, [refetch$, state$]);

  return (
    <MetricsChart
      id={`$metric-${type}`}
      type={type}
      nodes={nodes}
      loading={loading}
      extra={
        !!hostView?.loading ? <EuiLoadingSpinner size="s" /> : <>{hostView?.totalHits} total</>
      }
      {...props}
    />
  );
};
