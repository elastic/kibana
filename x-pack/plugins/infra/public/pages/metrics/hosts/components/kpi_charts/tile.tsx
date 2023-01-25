/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { SnapshotMetricType } from '../../../../../../common/inventory_models/types';

import { useSnapshot } from '../../../inventory_view/hooks/use_snaphot';
import { useHostsViewContext } from '../../hooks/use_hosts_view';
import { type ChartBaseProps, KPIChart } from './kpi_chart';

interface Props extends Omit<ChartBaseProps, 'type'> {
  type: SnapshotMetricType;
}
export const Tile = ({ type, ...props }: Props) => {
  const { baseRequest } = useHostsViewContext();

  const { nodes, loading } = useSnapshot({
    ...baseRequest,
    metrics: [{ type }],
    groupBy: null,
    includeTimeseries: true,
  });

  return <KPIChart id={`$metric-${type}`} type={type} nodes={nodes} loading={loading} {...props} />;
};
