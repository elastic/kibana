/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';

import { useSnapshot } from '../../../inventory_view/hooks/use_snaphot';
import { useHostsViewContext } from '../../hooks/use_host_table';
import { ChartBaseProps, MetricsChart } from './metrics_chart';

export const MetricsTile = ({ type, ...props }: ChartBaseProps) => {
  const { baseRequest, refetch$ } = useHostsViewContext();

  const { nodes, loading, reload } = useSnapshot({
    ...baseRequest,
    metrics: [{ type }],
    groupBy: null,
    includeTimeseries: true,
  });

  useEffect(() => {
    const subscribe = refetch$.subscribe(() => reload());
    return () => {
      subscribe.unsubscribe();
    };
  }, [refetch$, reload]);

  return (
    <MetricsChart id={`$metric-${type}`} type={type} nodes={nodes} loading={loading} {...props} />
  );
};
