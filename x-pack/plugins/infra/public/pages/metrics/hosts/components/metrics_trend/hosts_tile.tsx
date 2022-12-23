/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';

import { type HostViewState, useHostsViewContext } from '../../hooks/use_host_view';
import { type ChartBaseProps, MetricsChart } from './metrics_chart';

export const MetricsHostsTile = ({ type, ...props }: ChartBaseProps) => {
  const { state$, fetch$ } = useHostsViewContext();
  const [hostView, setHostView] = useState<HostViewState>(state$.getValue());

  useEffect(() => {
    const subscribe = state$.subscribe(setHostView);
    return () => {
      subscribe.unsubscribe();
    };
  }, [fetch$, state$]);

  return (
    <MetricsChart
      id={`$metric-${type}`}
      type={type}
      nodes={[]}
      loading={hostView.loading}
      overrideValue={hostView?.totalHits}
      {...props}
    />
  );
};
