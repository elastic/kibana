/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { useHostsViewContext } from '../../hooks/use_hosts_view';
import { type ChartBaseProps, MetricChartWrapper } from '../chart/metric_chart_wrapper';

export const HostsTile = ({ type, ...props }: ChartBaseProps) => {
  const { hostNodes, loading } = useHostsViewContext();

  return (
    <MetricChartWrapper
      id={`metric-${type}`}
      type={type}
      nodes={[]}
      loading={loading}
      overrideValue={hostNodes?.length}
      {...props}
    />
  );
};
