/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { SnapshotNode } from '../../../../../../common/http_api';
import type { SnapshotMetricType } from '../../../../../../common/inventory_models/types';

import { type ChartBaseProps, KPIChart } from './kpi_chart';

export interface TileProps extends Omit<ChartBaseProps, 'type'> {
  type: SnapshotMetricType;
  nodes: SnapshotNode[];
  loading: boolean;
}
export const Tile = ({ type, nodes, loading, ...props }: TileProps) => {
  return <KPIChart id={`$metric-${type}`} type={type} nodes={nodes} loading={loading} {...props} />;
};
