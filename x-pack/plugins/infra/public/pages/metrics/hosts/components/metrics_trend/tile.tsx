/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import type { SnapshotMetricType } from '../../../../../../common/inventory_models/types';

import { useSnapshot } from '../../../inventory_view/hooks/use_snaphot';
import { useHostsViewContext } from '../../hooks/use_host_view';
import { type ChartBaseProps, MetricsChart } from './metrics_chart';

interface Props extends Omit<ChartBaseProps, 'type'> {
  type: SnapshotMetricType;
}
export const MetricsTile = ({ type, ...props }: Props) => {
  const { baseRequest, fetch$ } = useHostsViewContext();

  const { nodes, loading, reload } = useSnapshot({
    ...baseRequest,
    metrics: [{ type }],
    groupBy: null,
    includeTimeseries: true,
  });

  useEffect(() => {
    const subscribe = fetch$.subscribe(() => reload());
    return () => {
      subscribe.unsubscribe();
    };
  }, [fetch$, reload]);

  return (
    <MetricsChart id={`$metric-${type}`} type={type} nodes={nodes} loading={loading} {...props} />
  );
};
